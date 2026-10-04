import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';

const MESES_NOMES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function ajustarDataParaNovoAno(dataStr: string, novoAno: number): string {
  if (!dataStr) return `${novoAno}-01-01`;
  const partes = String(dataStr).trim().split('-');
  if (partes.length !== 3) return `${novoAno}-01-01`;

  const mes = partes[1];
  let dia = partes[2];

  // Caso especial: 29 de fevereiro em ano bissexto sendo espelhado para ano não bissexto
  if (mes === '02' && dia === '29') {
    const isBissexto = (novoAno % 4 === 0 && novoAno % 100 !== 0) || novoAno % 400 === 0;
    if (!isBissexto) dia = '28';
  }

  return `${novoAno}-${mes}-${dia}`;
}

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const anoOrigem = Number(payload.anoOrigem);
    const anoDestino = Number(payload.anoDestino);
    const reajusteReceitasPct = Number(payload.reajusteReceitasPct || 0);
    const reajusteDespesasPct = Number(payload.reajusteDespesasPct || 0);
    const statusPadrao = String(payload.statusPadrao || 'Previsto').trim();
    const limparAnoDestinoAntes = Boolean(payload.limparAnoDestinoAntes);

    if (!anoOrigem || !anoDestino) {
      return NextResponse.json({ erro: 'Ano de origem e ano de destino são obrigatórios.' }, { status: 400 });
    }

    if (anoOrigem === anoDestino) {
      return NextResponse.json({ erro: 'O ano de destino deve ser diferente do ano de origem.' }, { status: 400 });
    }

    // 1. Buscar todos os lançamentos do ano de origem
    const registrosOrigem = await prisma.lancamento.findMany({
      where: { ano: anoOrigem },
    });

    if (registrosOrigem.length === 0) {
      return NextResponse.json(
        { erro: `Nenhum lançamento encontrado para o ano de origem ${anoOrigem}.` },
        { status: 404 }
      );
    }

    // 2. Se solicitado, limpar lançamentos já existentes no ano de destino antes de espelhar
    if (limparAnoDestinoAntes) {
      await prisma.lancamento.deleteMany({
        where: { ano: anoDestino },
      });
    }

    // 3. Montar os novos lançamentos aplicando os reajustes percentuais
    let totalEntradasNovas = 0;
    let totalSaidasNovas = 0;

    const novosLancamentos = registrosOrigem.map((item) => {
      const dataLctoNova = ajustarDataParaNovoAno(item.dataLcto, anoDestino);
      const competenciaNova = item.competencia
        ? ajustarDataParaNovoAno(item.competencia, anoDestino)
        : dataLctoNova;

      const mesNum = Number(dataLctoNova.slice(5, 7)) || item.mesNum;
      const mes = MESES_NOMES[mesNum] || item.mes;

      const natNorm = item.natureza.toLowerCase();
      const isReceita = natNorm === 'receita';
      const valorAbs = Math.abs(item.valor);

      let novoValorAbs = valorAbs;
      if (isReceita) {
        novoValorAbs = valorAbs * (1 + reajusteReceitasPct / 100);
        totalEntradasNovas += novoValorAbs;
      } else {
        novoValorAbs = valorAbs * (1 + reajusteDespesasPct / 100);
        totalSaidasNovas += novoValorAbs;
      }

      // Arredondar para duas casas decimais
      novoValorAbs = Math.round(novoValorAbs * 100) / 100;
      const novoValorFinal = isReceita ? novoValorAbs : -novoValorAbs;

      let statusFinal = item.status;
      if (statusPadrao === 'À Pagar / À Receber' || statusPadrao === 'Previsto') {
        statusFinal = isReceita ? 'À Receber' : 'À Pagar';
      } else if (statusPadrao === 'Pago / Recebido' || statusPadrao === 'Realizado') {
        statusFinal = isReceita ? 'Recebido' : 'Pago';
      } else if (statusPadrao === 'Original') {
        statusFinal = item.status;
      } else {
        statusFinal = statusPadrao;
      }

      return {
        competencia: competenciaNova,
        dataLcto: dataLctoNova,
        ano: anoDestino,
        mesNum,
        mes,
        natureza: item.natureza,
        grupo: item.grupo,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        responsavel: item.responsavel,
        valor: novoValorFinal,
        status: statusFinal,
        observacao: `Espelhado de ${anoOrigem}${
          isReceita && reajusteReceitasPct !== 0
            ? ` (+${reajusteReceitasPct}%)`
            : !isReceita && reajusteDespesasPct !== 0
            ? ` (+${reajusteDespesasPct}%)`
            : ''
        }`,
      };
    });

    // 4. Inserir em lote no banco de dados
    await prisma.lancamento.createMany({
      data: novosLancamentos,
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `${novosLancamentos.length} lançamentos gerados com sucesso para ${anoDestino}!`,
      estatisticas: {
        quantidade: novosLancamentos.length,
        totalEntradas: Math.round(totalEntradasNovas * 100) / 100,
        totalSaidas: Math.round(totalSaidasNovas * 100) / 100,
        resultado: Math.round((totalEntradasNovas - totalSaidasNovas) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Erro ao espelhar ano:', error);
    return NextResponse.json({ erro: 'Falha ao processar espelhamento anual' }, { status: 500 });
  }
}
