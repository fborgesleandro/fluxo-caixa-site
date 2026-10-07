import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🔄 Iniciando processo de backup do SQLite...');

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Backup Físico
  const srcDb = path.join(process.cwd(), 'prisma', 'dev.db');
  const backupDb = path.join(process.cwd(), 'prisma', 'dev.db.backup-pre-neon.bak');

  if (fs.existsSync(srcDb)) {
    fs.copyFileSync(srcDb, backupDb);
    const stats = fs.statSync(backupDb);
    console.log(`✅ Backup físico criado com sucesso: prisma/dev.db.backup-pre-neon.bak (${stats.size} bytes)`);
  } else {
    throw new Error('Arquivo prisma/dev.db não encontrado!');
  }

  // 2. Extração dos dados via Prisma
  console.log('📦 Extraindo dados do SQLite...');
  const usuarios = await prisma.usuario.findMany({ orderBy: { createdAt: 'asc' } });
  const lancamentos = await prisma.lancamento.findMany({ orderBy: { createdAt: 'asc' } });
  const investimentos = await prisma.investimento.findMany({ orderBy: { createdAt: 'asc' } });

  console.log(`- Usuários encontrados: ${usuarios.length}`);
  console.log(`- Lançamentos encontrados: ${lancamentos.length}`);
  console.log(`- Investimentos encontrados: ${investimentos.length}`);

  if (usuarios.length !== 2) {
    throw new Error(`Contagem de usuários divergente: esperado 2, obtido ${usuarios.length}`);
  }
  if (lancamentos.length !== 580) {
    throw new Error(`Contagem de lançamentos divergente: esperado 580, obtido ${lancamentos.length}`);
  }
  if (investimentos.length !== 6) {
    throw new Error(`Contagem de investimentos divergente: esperado 6, obtido ${investimentos.length}`);
  }

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'sqlite',
      counts: {
        usuarios: usuarios.length,
        lancamentos: lancamentos.length,
        investimentos: investimentos.length,
        total: usuarios.length + lancamentos.length + investimentos.length,
      },
    },
    usuarios,
    lancamentos,
    investimentos,
  };

  const jsonPath = path.join(backupDir, 'backup-sqlite-pre-neon.json');
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');
  const jsonStats = fs.statSync(jsonPath);
  console.log(`✅ Backup JSON estruturado criado com sucesso: backups/backup-sqlite-pre-neon.json (${jsonStats.size} bytes)`);
  console.log(`✨ Total de 588 registros auditados e garantidos no backup!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no backup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
