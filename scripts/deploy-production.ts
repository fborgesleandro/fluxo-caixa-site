import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { verificarSenha } from '../src/lib/auth';

async function main() {
  console.log('🚀 Iniciando Processo de Migração e Carga na Branch PRODUCTION do Neon...\n');

  const prodEnvPath = path.join(process.cwd(), '.env.production');
  if (!fs.existsSync(prodEnvPath)) {
    throw new Error('.env.production não encontrado!');
  }

  const prodEnvContent = fs.readFileSync(prodEnvPath, 'utf8');
  const dbMatch = prodEnvContent.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
  const directMatch = prodEnvContent.match(/^DIRECT_URL="?([^"\r\n]+)"?/m);

  if (!dbMatch || !dbMatch[1] || !dbMatch[1].startsWith('postgres')) {
    throw new Error('DATABASE_URL inválida ou não preenchida em .env.production');
  }
  if (!directMatch || !directMatch[1] || !directMatch[1].startsWith('postgres')) {
    throw new Error('DIRECT_URL inválida ou não preenchida em .env.production');
  }

  const databaseUrl = dbMatch[1].trim();
  const directUrl = directMatch[1].trim();

  // 1. Executar prisma migrate deploy usando a DIRECT_URL
  console.log('📦 Passo 1: Aplicando Prisma Migrations na branch PRODUCTION...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
    },
  });
  console.log('✅ Migrations aplicadas com sucesso na branch PRODUCTION!\n');

  // 2. Conectar à base de produção para carga dos dados
  console.log('🔄 Passo 2: Inicializando carga dos 588 registros em PRODUCTION...');
  const prismaProd = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });

  const jsonPath = path.join(process.cwd(), 'backups', 'backup-sqlite-pre-neon.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const { usuarios, lancamentos, investimentos } = JSON.parse(raw);

  // Inserção Usuários
  console.log('  - Inserindo usuários...');
  for (const u of usuarios) {
    await prismaProd.usuario.upsert({
      where: { username: u.username },
      update: {
        nome: u.nome,
        senha: u.senha,
        role: u.role,
        updatedAt: new Date(u.updatedAt),
      },
      create: {
        id: u.id,
        username: u.username,
        nome: u.nome,
        senha: u.senha,
        role: u.role,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }

  // Inserção Investimentos
  console.log('  - Inserindo investimentos...');
  for (const inv of investimentos) {
    await prismaProd.investimento.upsert({
      where: { id: inv.id },
      update: {
        banco: inv.banco,
        tipo: inv.tipo,
        valor: inv.valor,
        dataAtualizacao: inv.dataAtualizacao,
        observacao: inv.observacao,
        updatedAt: new Date(inv.updatedAt),
      },
      create: {
        id: inv.id,
        banco: inv.banco,
        tipo: inv.tipo,
        valor: inv.valor,
        dataAtualizacao: inv.dataAtualizacao,
        observacao: inv.observacao,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
      },
    });
  }

  // Inserção Lançamentos em lotes
  console.log('  - Inserindo 580 lançamentos em lotes de 100...');
  const batchSize = 100;
  for (let i = 0; i < lancamentos.length; i += batchSize) {
    const chunk = lancamentos.slice(i, i + batchSize);
    await prismaProd.$transaction(
      chunk.map((l: any) =>
        prismaProd.lancamento.upsert({
          where: { id: l.id },
          update: {
            competencia: l.competencia,
            dataLcto: l.dataLcto,
            ano: l.ano,
            mesNum: l.mesNum,
            mes: l.mes,
            natureza: l.natureza,
            grupo: l.grupo,
            categoria: l.categoria,
            subcategoria: l.subcategoria,
            responsavel: l.responsavel,
            valor: l.valor,
            status: l.status,
            observacao: l.observacao,
            updatedAt: new Date(l.updatedAt),
          },
          create: {
            id: l.id,
            competencia: l.competencia,
            dataLcto: l.dataLcto,
            ano: l.ano,
            mesNum: l.mesNum,
            mes: l.mes,
            natureza: l.natureza,
            grupo: l.grupo,
            categoria: l.categoria,
            subcategoria: l.subcategoria,
            responsavel: l.responsavel,
            valor: l.valor,
            status: l.status,
            observacao: l.observacao,
            createdAt: new Date(l.createdAt),
            updatedAt: new Date(l.updatedAt),
          },
        })
      )
    );
  }
  console.log('✅ Carga de registros concluída em PRODUCTION!\n');

  // 3. Auditoria e Validação pós-carga em Produção
  console.log('🔍 Passo 3: Executando auditoria rigorosa de contagem em PRODUCTION...');
  const totalUsuarios = await prismaProd.usuario.count();
  const totalLancamentos = await prismaProd.lancamento.count();
  const totalInvestimentos = await prismaProd.investimento.count();

  console.log('======================================================');
  console.log('📊 AUDITORIA DO BANCO DE PRODUÇÃO (NEON MAIN):');
  console.log(`  • Usuários:       ${totalUsuarios} (Esperado: 2)`);
  console.log(`  • Lançamentos:    ${totalLancamentos} (Esperado: 580)`);
  console.log(`  • Investimentos:  ${totalInvestimentos} (Esperado: 6)`);
  console.log(`  • TOTAL:          ${totalUsuarios + totalLancamentos + totalInvestimentos} (Esperado: 588)`);
  console.log('======================================================\n');

  if (totalUsuarios !== 2 || totalLancamentos !== 580 || totalInvestimentos !== 6) {
    throw new Error('Divergência de contagem no banco de produção!');
  }

  // 4. Teste de Autenticação em Produção
  console.log('🔐 Passo 4: Validando autenticação dos usuários em PRODUCTION...');
  const userLeandro = await prismaProd.usuario.findUnique({ where: { username: 'leandrob' } });
  const passOkLeandro = await verificarSenha('Lek002**', userLeandro!.senha);
  if (!passOkLeandro) throw new Error('Falha na autenticação do usuário leandrob em produção!');
  console.log('  ✅ Senha de leandrob validada com sucesso em produção');

  const userJipsya = await prismaProd.usuario.findUnique({ where: { username: 'jipsyab' } });
  const passOkJipsya = await verificarSenha('toy02sushi02', userJipsya!.senha);
  if (!passOkJipsya) throw new Error('Falha na autenticação do usuário jipsyab em produção!');
  console.log('  ✅ Senha de jipsyab validada com sucesso em produção');

  await prismaProd.$disconnect();
  console.log('\n✨ SUCESSO: Banco de produção (Neon main) 100% migrado, populado e auditado!');
}

main().catch((e) => {
  console.error('\n❌ ERRO NA MIGRAÇÃO DE PRODUÇÃO:', e);
  process.exit(1);
});
