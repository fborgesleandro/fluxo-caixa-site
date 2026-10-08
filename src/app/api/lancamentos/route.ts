import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';
import { calcularStatusAutomatico } from '@/lib/recorrencia';

const MESES_NOMES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatarDataISO(dataStr: string): string {
  if (!dataStr) return '';
  const limpa = String(dataStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpa)) return limpa;
  const br = limpa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return limpa;
}

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const lancamentos = await prisma.lancamento.findMany({
      orderBy: [{ dataLcto: 'asc' }, { createdAt: 'asc' }],
    });

    // Extrair opções únicas para os filtros
    const anosSet = new Set<number>();
    const mesesMap = new Map<number, string>();
    const naturezasSet = new Set<string>();
    const gruposSet = new Set<string>();
    const categoriasSet = new Set<string>();
    const subcategoriasSet = new Set<string>();
    const responsaveisSet = new Set<string>();
    const statusSet = new Set<string>();

    lancamentos.forEach((l) => {
      if (l.ano) anosSet.add(l.ano);
      if (l.mesNum) mesesMap.set(l.mesNum, l.mes);
      if (l.natureza) naturezasSet.add(l.natureza);
      if (l.grupo) gruposSet.add(l.grupo);
      if (l.categoria) categoriasSet.add(l.categoria);
      if (l.subcategoria) subcategoriasSet.add(l.subcategoria);
      if (l.responsavel) responsaveisSet.add(l.responsavel);
      if (l.status) statusSet.add(l.status);
    });

    const filtros = {
      anos: Array.from(anosSet).sort((a, b) => b - a),
      meses: Array.from(mesesMap.entries())
        .map(([numero, nome]) => ({ numero, nome }))
        .sort((a, b) => a.numero - b.numero),
      naturezas: Array.from(naturezasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      grupos: Array.from(gruposSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      categorias: Array.from(categoriasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      subcategorias: Array.from(subcategoriasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      responsaveis: Array.from(responsaveisSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      status: Array.from(statusSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };

    return NextResponse.json({
      registros: lancamentos,
      filtros,
      meta: {
        totalRegistros: lancamentos.length,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json({ erro: 'Erro ao carregar dados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const id = payload.id ? String(payload.id).trim() : null;
    const dataLcto = formatarDataISO(payload.dataLcto);
    const competencia = formatarDataISO(payload.competencia || dataLcto);
    const natureza = String(payload.natureza || 'Despesa').trim();
    const grupo = String(payload.grupo || '').trim();
    const categoria = String(payload.categoria || '').trim();
    const subcategoria = String(payload.subcategoria || '').trim();
    const responsavel = String(payload.responsavel || '').trim();
    const natNorm = natureza.toLowerCase();

    let valorNum = Number(payload.valor);
    if (isNaN(valorNum)) {
      return NextResponse.json({ erro: 'Valor inválido' }, { status: 400 });
    }

    // Regra financeira: Receita é positiva, Despesa e Custo são negativos
    if (natNorm === 'receita') {
      valorNum = Math.abs(valorNum);
    } else {
      valorNum = -Math.abs(valorNum);
    }

    // Extrair ano e mês
    const dataRef = dataLcto || competencia || new Date().toISOString().slice(0, 10);
    const ano = Number(dataRef.slice(0, 4)) || new Date().getFullYear();
    const mesNum = Number(dataRef.slice(5, 7)) || (new Date().getMonth() + 1);
    const mes = MESES_NOMES[mesNum] || '';
    const observacao = payload.observacao ? String(payload.observacao).trim() : null;

    let status = payload.status ? String(payload.status).trim() : '';

    if (id) {
      // Edição de lançamento existente
      const existente = await prisma.lancamento.findUnique({ where: { id } });
      if (!existente) {
        return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 });
      }

      const dataMudou = Boolean(dataLcto && dataLcto !== existente.dataLcto);
      const naturezaMudou = Boolean(natureza && natureza !== existente.natureza);

      // Regra de Edição: Se DATA LCTO ou Natureza mudou, recalcula automaticamente o STATUS
      // mantendo consistência (ex: mudar de novembro para setembro muda À Pagar para Pago)
      if (dataMudou || naturezaMudou) {
        if (!status || status === existente.status || status === 'Realizado') {
          status = calcularStatusAutomatico(natureza, dataLcto);
        }
      } else {
        if (!status || status === 'Realizado') {
          status = existente.status || calcularStatusAutomatico(natureza, dataLcto);
        }
      }

      const dados = {
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
        status,
        observacao,
      };

      const registro = await prisma.lancamento.update({
        where: { id },
        data: dados,
      });

      return NextResponse.json({ sucesso: true, registro });
    } else {
      // Criação de novo lançamento pontual: STATUS calculado automaticamente com base na DATA LCTO e Natureza
      if (!status || status === 'Realizado') {
        status = calcularStatusAutomatico(natureza, dataLcto);
      }

      const dados = {
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
        status,
        observacao,
      };

      const registro = await prisma.lancamento.create({
        data: dados,
      });

      return NextResponse.json({ sucesso: true, registro });
    }
  } catch (error) {
    console.error('Erro ao salvar lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao salvar lançamento' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const anoStr = searchParams.get('ano');

    if (anoStr) {
      const anoNum = Number(anoStr);
      if (!anoNum || isNaN(anoNum)) {
        return NextResponse.json({ erro: 'Ano inválido' }, { status: 400 });
      }
      const resultado = await prisma.lancamento.deleteMany({
        where: { ano: anoNum },
      });
      return NextResponse.json({
        sucesso: true,
        mensagem: `Lançamentos do ano ${anoNum} excluídos com sucesso.`,
        quantidadeExcluida: resultado.count,
      });
    }

    if (!id) {
      return NextResponse.json({ erro: 'ID ou ano não informado' }, { status: 400 });
    }

    await prisma.lancamento.delete({
      where: { id },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao excluir lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao excluir lançamento' }, { status: 500 });
  }
}
