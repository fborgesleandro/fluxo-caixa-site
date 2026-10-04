import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';
import Papa from 'papaparse';

const MESES_NOMES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function normalizarCabecalho(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizarData(valor: unknown): string {
  if (!valor) return '';
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const dia = br[1].padStart(2, '0');
    const mes = br[2].padStart(2, '0');
    const ano = br[3];
    return `${ano}-${mes}-${dia}`;
  }
  return texto;
}

function numeroSeguro(valor: unknown): number {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;

  let texto = String(valor).trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  const num = Number(texto);
  return isNaN(num) ? 0 : num;
}

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { csvContent, tipo, limparAntes } = await request.json();

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ erro: 'Conteúdo CSV/tabela não fornecido' }, { status: 400 });
    }

    // Auto-detectar delimitador (, ; ou tabulação)
    const rawParsed = Papa.parse(csvContent.trim(), {
      skipEmptyLines: 'greedy',
    });

    const linhasMatriz = rawParsed.data as string[][];
    if (!linhasMatriz || linhasMatriz.length === 0) {
      return NextResponse.json({ erro: 'Nenhum dado encontrado no conteúdo informado' }, { status: 400 });
    }

    // Identificar se a primeira linha é cabeçalho
    const primeiraLinha = linhasMatriz[0].map((c) => String(c || '').trim());
    const primeiraLinhaNorm = primeiraLinha.map(normalizarCabecalho);

    const temCabecalhoInvest =
      primeiraLinhaNorm.some((c) => c.includes('banco') || c.includes('tipo') || c.includes('valor'));
    const temCabecalhoLanc =
      primeiraLinhaNorm.some((c) => c.includes('competencia') || c.includes('data') || c.includes('natureza') || c.includes('valor'));

    // ==========================================
    // IMPORTAÇÃO DE INVESTIMENTOS
    // ==========================================
    if (tipo === 'investimentos') {
      if (limparAntes) {
        await prisma.investimento.deleteMany({});
      }

      let idxBanco = 0;
      let idxTipo = 1;
      let idxValor = 2;
      let idxData = 3;

      let inicioLinha = 0;
      if (temCabecalhoInvest) {
        inicioLinha = 1;
        primeiraLinhaNorm.forEach((c, idx) => {
          if (c.includes('banco') || c.includes('instituicao')) idxBanco = idx;
          else if (c.includes('tipo') || c.includes('ativo')) idxTipo = idx;
          else if (c.includes('valor') || c.includes('saldo') || c.includes('total')) idxValor = idx;
          else if (c.includes('data') || c.includes('atualizacao')) idxData = idx;
        });
      }

      let inseridos = 0;
      for (let i = inicioLinha; i < linhasMatriz.length; i++) {
        const linha = linhasMatriz[i];
        if (!linha || linha.length === 0) continue;

        const banco = String(linha[idxBanco] || '').trim().toUpperCase();
        const tipoAtivo = String(linha[idxTipo] || '').trim();
        const valorRaw = linha[idxValor];
        const dataRaw = linha[idxData];

        if (!banco && !tipoAtivo) continue;

        const valorNum = Math.abs(numeroSeguro(valorRaw));
        const dataFormatada = normalizarData(dataRaw) || new Date().toISOString().slice(0, 10);

        await prisma.investimento.create({
          data: {
            banco: banco || 'OUTROS',
            tipo: tipoAtivo || 'Ativo Geral',
            valor: valorNum,
            dataAtualizacao: dataFormatada,
          },
        });
        inseridos++;
      }

      const todos = await prisma.investimento.findMany({
        orderBy: [{ dataAtualizacao: 'desc' }, { createdAt: 'desc' }],
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: `${inseridos} registros de investimentos importados com sucesso!`,
        total: inseridos,
        registros: todos,
      });
    }

    // ==========================================
    // IMPORTAÇÃO DE LANÇAMENTOS (FLUXO DE CAIXA)
    // ==========================================
    if (limparAntes) {
      await prisma.lancamento.deleteMany({});
    }

    let mapaIndices: Record<string, number> = {};
    let inicioLinhaLanc = 0;

    if (temCabecalhoLanc) {
      inicioLinhaLanc = 1;
      primeiraLinhaNorm.forEach((c, idx) => {
        if (c) mapaIndices[c] = idx;
      });
    } else {
      // Posições padrão:
      // 0: Competencia, 1: Data Lcto, 2: Natureza, 3: Grupo, 4: Categoria, 5: Subcategoria, 6: Responsavel, 7: Valor, 8: Status
      mapaIndices = {
        competencia: 0,
        datalcto: 1,
        natureza: 2,
        grupo: 3,
        categoria: 4,
        subcategoria: 5,
        responsavel: 6,
        valor: 7,
        status: 8,
      };
    }

    const getVal = (linha: string[], chave: string) => {
      // Procurar chave exata ou similar
      for (const [col, idx] of Object.entries(mapaIndices)) {
        if (col.includes(chave) || chave.includes(col)) {
          return String(linha[idx] || '').trim();
        }
      }
      return '';
    };

    let inseridos = 0;
    for (let i = inicioLinhaLanc; i < linhasMatriz.length; i++) {
      const linha = linhasMatriz[i];
      if (!linha || linha.every((v) => !v || v.trim() === '')) continue;

      const dataLctoRaw = getVal(linha, 'datalcto') || getVal(linha, 'data') || '';
      const compRaw = getVal(linha, 'competencia') || dataLctoRaw;
      const dataLcto = normalizarData(dataLctoRaw);
      const competencia = normalizarData(compRaw) || dataLcto;

      if (!dataLcto && !competencia) continue;

      const natureza = getVal(linha, 'natureza') || (numeroSeguro(getVal(linha, 'valor')) >= 0 ? 'Receita' : 'Despesa');
      const grupo = getVal(linha, 'grupo');
      const categoria = getVal(linha, 'categoria');
      const subcategoria = getVal(linha, 'subcategoria');
      const responsavel = getVal(linha, 'responsavel');
      const natNorm = natureza.toLowerCase();
      const statusRaw = getVal(linha, 'status');
      let status = statusRaw;
      if (!status || status.toLowerCase() === 'realizado') {
        status = natNorm === 'receita' ? 'Recebido' : 'Pago';
      }
      const valorBruto = numeroSeguro(getVal(linha, 'valor'));

      let valorFinal = valorBruto;
      if (natNorm === 'receita') {
        valorFinal = Math.abs(valorBruto);
      } else {
        valorFinal = -Math.abs(valorBruto);
      }

      const dataRef = dataLcto || competencia;
      const ano = Number(dataRef.slice(0, 4)) || new Date().getFullYear();
      const mesNum = Number(dataRef.slice(5, 7)) || (new Date().getMonth() + 1);
      const mes = MESES_NOMES[mesNum] || '';

      await prisma.lancamento.create({
        data: {
          competencia,
          dataLcto: dataLcto || competencia,
          ano,
          mesNum,
          mes,
          natureza,
          grupo,
          categoria,
          subcategoria,
          responsavel,
          valor: valorFinal,
          status,
        },
      });

      inseridos++;
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `${inseridos} lançamentos importados com sucesso para o banco de dados!`,
      total: inseridos,
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    return NextResponse.json({ erro: 'Falha ao importar dados' }, { status: 500 });
  }
}
