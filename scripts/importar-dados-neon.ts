import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🚀 Iniciando carga dos dados no PostgreSQL (Neon)...');

  const jsonPath = path.join(process.cwd(), 'backups', 'backup-sqlite-pre-neon.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Arquivo de backup não encontrado em: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const backup = JSON.parse(raw);

  const { usuarios, lancamentos, investimentos } = backup;

  console.log(`📋 Registros carregados do backup:`);
  console.log(`- Usuários: ${usuarios.length}`);
  console.log(`- Lançamentos: ${lancamentos.length}`);
  console.log(`- Investimentos: ${investimentos.length}`);

  if (usuarios.length !== 2 || lancamentos.length !== 580 || investimentos.length !== 6) {
    throw new Error('Integridade do backup corrompida! Abortando carga.');
  }

  // 1. Inserção de Usuários
  console.log('\n👤 Inserindo usuários no PostgreSQL...');
  for (const u of usuarios) {
    await prisma.usuario.upsert({
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
  console.log('✅ Usuários inseridos com sucesso!');

  // 2. Inserção de Investimentos
  console.log('\n📈 Inserindo investimentos no PostgreSQL...');
  for (const inv of investimentos) {
    await prisma.investimento.upsert({
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
  console.log('✅ Investimentos inseridos com sucesso!');

  // 3. Inserção de Lançamentos em lotes de 100
  console.log('\n💸 Inserindo lançamentos no PostgreSQL...');
  const batchSize = 100;
  for (let i = 0; i < lancamentos.length; i += batchSize) {
    const chunk = lancamentos.slice(i, i + batchSize);
    
    // Inserir individualmente para garantir integridade caso já existam
    await prisma.$transaction(
      chunk.map((l: any) =>
        prisma.lancamento.upsert({
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
    console.log(`  - Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(lancamentos.length / batchSize)} processado...`);
  }
  console.log('✅ Todos os lançamentos inseridos com sucesso!');

  // 4. Auditoria pós-carga
  console.log('\n🔍 Executando auditoria e validação de contagem no PostgreSQL...');
  const totalUsuarios = await prisma.usuario.count();
  const totalLancamentos = await prisma.lancamento.count();
  const totalInvestimentos = await prisma.investimento.count();

  console.log(`\n========================================`);
  console.log(`📊 RELATÓRIO DE AUDITORIA PÓS-CARGA:`);
  console.log(`  - Usuários no PostgreSQL:       ${totalUsuarios} (Esperado: 2)`);
  console.log(`  - Lançamentos no PostgreSQL:    ${totalLancamentos} (Esperado: 580)`);
  console.log(`  - Investimentos no PostgreSQL:  ${totalInvestimentos} (Esperado: 6)`);
  console.log(`  - TOTAL DE REGISTROS:           ${totalUsuarios + totalLancamentos + totalInvestimentos} (Esperado: 588)`);
  console.log(`========================================\n`);

  if (totalUsuarios !== 2 || totalLancamentos !== 580 || totalInvestimentos !== 6) {
    throw new Error('Divergência detectada nas contagens pós-carga!');
  }

  console.log('✨ SUCESSO: Todos os 588 registros migrados e validados com 100% de integridade!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a carga no PostgreSQL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
