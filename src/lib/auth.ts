import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente.');
  }
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  userId: string;
  username: string;
  nome: string;
  role: string;
}

export async function criarToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey());
}

export async function verificarToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function obterUsuarioSessao(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fcx_token')?.value;
    if (!token) return null;
    return await verificarToken(token);
  } catch {
    return null;
  }
}

export async function verificarSenha(senhaPlana: string, senhaHash: string): Promise<boolean> {
  return bcrypt.compare(senhaPlana, senhaHash);
}
