import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';
import { calcularDatasRecorrencia, calcularStatusAutomatico } from '@/lib/recorrencia';

const MESES_NOMES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatarDataISO(dataStr: string): string {
  if (!dataStr) return '';
  const limpa = String(dataStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpa)) return limpa;
  const br = limpa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return limpa;
}

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const dataInicio = formatarDataISO(payload.dataInicio);
    const dataFim = formatarDataISO(payload.dataFim);

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { erro: 'Data Inicial e Data Final são obrigatórias.' },
        { status: 400 }
      );
    }

    if (dataInicio > dataFim) {
      return NextResponse.json(
        { erro: 'A Data Inicial não pode ser posterior à Data Final.' },
        { status: 400 }
      );
    }

    const natureza = String(payload.natureza || 'Despesa').trim();
    const grupo = String(payload.grupo || '').trim();
    const categoria = String(payload.categoria || '').trim();
    const subcategoria = String(payload.subcategoria || '').trim();
    const responsavel = String(payload.responsavel || '').trim();

    if (!grupo || !categoria || !subcategoria || !responsavel) {
      return NextResponse.json(
        { erro: 'Grupo, Categoria, Subcategoria e Responsável são obrigatórios.' },
        { status: 400 }
      );
    }

    const valorBruto = Number(payload.valor);
    if (isNaN(valorBruto) || valorBruto === 0) {
      return NextResponse.json(
        { erro: 'Informe um valor numérico válido e diferente de zero.' },
        { status: 400 }
      );
    }

    const natNorm = natureza.toLowerCase();
    const valorNum = natNorm === 'receita' ? Math.abs(valorBruto) : -Math.abs(valorBruto);
    const observacao = payload.observacao ? String(payload.observacao).trim() : null;

    // 1. Calcular datas mensais com tratamento correto de dias válidos
    const datas = calcularDatasRecorrencia(dataInicio, dataFim);
    if (datas.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhuma data válida gerada para o intervalo informado.' },
        { status: 400 }
      );
    }

    // Limite de segurança razoável para evitar loops infinitos (ex: max 120 meses / 10 anos)
    if (datas.length > 120) {
      return NextResponse.json(
        { erro: 'O período informado excede o limite máximo de 120 lançamentos (10 anos).' },
        { status: 400 }
      );
    }

    // 2. Executar inserção em lote atômica via transação Prisma
    // O STATUS é calculado individualmente para cada lançamento com base na sua DATA LCTO
    const criados = await prisma.$transaction(async (tx) => {
      const registros = [];

      for (const dataLcto of datas) {
        const ano = Number(dataLcto.slice(0, 4));
        const mesNum = Number(dataLcto.slice(5, 7));
        const mes = MESES_NOMES[mesNum] || '';
        const competencia = dataLcto;
        const statusItem = calcularStatusAutomatico(natureza, dataLcto);

        const reg = await tx.lancamento.create({
          data: {
            competencia,
            dataLcto,
            ano,
            mesNum,
            mes,
            natureza,
            grupo,
            categoria,
            subcategoria,
            responsavel,
            valor: valorNum,
            status: statusItem,
            observacao,
          },
        });
        registros.push(reg);
      }

      return registros;
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `${criados.length} lançamentos recorrentes criados com sucesso.`,
      quantidadeCriada: criados.length,
      registros: criados,
    });
  } catch (error: any) {
    console.error('Erro ao gerar lançamentos recorrentes:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar lançamentos recorrentes.', detalhe: error?.message },
      { status: 500 }
    );
  }
}
