import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';

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
    const registros = await prisma.investimento.findMany({
      orderBy: [{ dataAtualizacao: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      registros,
      cabecalhos: ['Banco', 'Tipo', 'Valor', 'Data Atualização'],
    });
  } catch (error) {
    console.error('Erro ao buscar investimentos:', error);
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
    const banco = String(payload.banco || '').trim().toUpperCase();
    const tipo = String(payload.tipo || '').trim();
    const valorNum = Number(payload.valor);
    const dataAtualizacao = formatarDataISO(payload.dataAtualizacao || new Date().toISOString().slice(0, 10));
    const criarNovoHistorico = Boolean(payload.criarNovoHistorico);

    if (!banco || !tipo || isNaN(valorNum)) {
      return NextResponse.json({ erro: 'Banco, tipo e valor são obrigatórios.' }, { status: 400 });
    }

    const dados = {
      banco,
      tipo,
      valor: Math.abs(valorNum),
      dataAtualizacao,
      observacao: payload.observacao ? String(payload.observacao).trim() : null,
    };

    let registro;
    if (id && !criarNovoHistorico) {
      registro = await prisma.investimento.update({
        where: { id },
        data: dados,
      });
    } else {
      registro = await prisma.investimento.create({
        data: dados,
      });
    }

    const todos = await prisma.investimento.findMany({
      orderBy: [{ dataAtualizacao: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ sucesso: true, registro, registros: todos });
  } catch (error) {
    console.error('Erro ao salvar investimento:', error);
    return NextResponse.json({ erro: 'Erro ao salvar investimento' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ erro: 'ID não informado' }, { status: 400 });
    }

    await prisma.investimento.delete({
      where: { id },
    });

    const todos = await prisma.investimento.findMany({
      orderBy: [{ dataAtualizacao: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ sucesso: true, registros: todos });
  } catch (error) {
    console.error('Erro ao excluir investimento:', error);
    return NextResponse.json({ erro: 'Erro ao excluir investimento' }, { status: 500 });
  }
}
