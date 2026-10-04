import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { obterUsuarioSessao } from '@/lib/auth';

export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const ano = Number(payload.ano);

    if (!ano || isNaN(ano)) {
      return NextResponse.json({ erro: 'Ano inválido ou não informado.' }, { status: 400 });
    }

    // 1. Contar quantos lançamentos existem para este ano
    const totalExistente = await prisma.lancamento.count({
      where: { ano },
    });

    if (totalExistente === 0) {
      return NextResponse.json(
        { erro: `Nenhum lançamento encontrado no banco de dados para o ano ${ano}.` },
        { status: 404 }
      );
    }

    // 2. Excluir permanentemente todos os lançamentos daquele ano
    const resultado = await prisma.lancamento.deleteMany({
      where: { ano },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `Base do ano ${ano} excluída com sucesso! ${resultado.count} lançamentos foram removidos.`,
      quantidadeExcluida: resultado.count,
      ano,
    });
  } catch (error) {
    console.error('Erro ao excluir base anual:', error);
    return NextResponse.json(
      { erro: 'Erro interno no servidor ao excluir base anual.' },
      { status: 500 }
    );
  }
}
