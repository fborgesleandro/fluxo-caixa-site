import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Compatibilidade com ambiente Serverless da Vercel:
// No deploy da Vercel, o diretório raiz é somente leitura.
// Copiamos a base dev.db para o diretório gravável /tmp se estiver na Vercel.
if (process.env.VERCEL) {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tmpDbPath);
    }
    process.env.DATABASE_URL = 'file:/tmp/dev.db';
  } catch (err) {
    console.warn('Aviso: Não foi possível sincronizar dev.db para /tmp:', err);
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
