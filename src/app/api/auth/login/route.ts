import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verificarSenha, criarToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { usuario, senha } = await request.json();

    const usernameNormalizado = String(usuario || '').trim().toLowerCase();
    const senhaInformada = String(senha || '');

    if (!usernameNormalizado || !senhaInformada) {
      return NextResponse.json(
        { autenticado: false, mensagem: 'Informe usuário e senha.' },
        { status: 400 }
      );
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { username: usernameNormalizado },
    });

    if (!usuarioDb) {
      return NextResponse.json(
        { autenticado: false, mensagem: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    const senhaValida = await verificarSenha(senhaInformada, usuarioDb.senha);
    if (!senhaValida) {
      return NextResponse.json(
        { autenticado: false, mensagem: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    const token = await criarToken({
      userId: usuarioDb.id,
      username: usuarioDb.username,
      nome: usuarioDb.nome,
      role: usuarioDb.role,
    });

    const response = NextResponse.json({
      autenticado: true,
      usuario: {
        id: usuarioDb.id,
        username: usuarioDb.username,
        nome: usuarioDb.nome,
        role: usuarioDb.role,
      },
    });

    response.cookies.set('fcx_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { autenticado: false, mensagem: 'Erro interno ao autenticar.' },
      { status: 500 }
    );
  }
}
