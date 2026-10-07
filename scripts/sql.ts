import { prisma } from '../src/lib/db';
import readline from 'readline';

async function executeQuery(query: string) {
  const cleanQuery = query.trim().replace(/;$/, '');
  if (!cleanQuery) return;

  // Comandos auxiliares
  if (cleanQuery.toLowerCase() === '.tables') {
    const tables: any[] = await prisma.$queryRawUnsafe(
      `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE '_prisma_%' ORDER BY table_name;`
    );
    console.log('\n📋 Tabelas disponíveis:');
    tables.forEach((t) => console.log(`  - ${t.name}`));
    console.log();
    return;
  }

  const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(cleanQuery);

  try {
    const startTime = Date.now();
    if (isSelect) {
      const results: any[] = await prisma.$queryRawUnsafe(cleanQuery);
      const elapsed = Date.now() - startTime;
      if (results.length === 0) {
        console.log(`\n(Nenhum registro retornado - ${elapsed}ms)\n`);
      } else {
        console.log(`\nResultados (${results.length} registros, ${elapsed}ms):`);
        console.table(results);
      }
    } else {
      const affectedRows = await prisma.$executeRawUnsafe(cleanQuery);
      const elapsed = Date.now() - startTime;
      console.log(`\n✅ Comando executado com sucesso! Linhas afetadas: ${affectedRows} (${elapsed}ms)\n`);
    }
  } catch (error: any) {
    console.error(`\n❌ Erro SQL: ${error.message || error}\n`);
  }
}

async function main() {
  const args = process.argv.slice(2).join(' ').trim();

  if (args) {
    // Execução direta de argumento: npm run sql -- "SELECT * FROM Usuario"
    await executeQuery(args);
    await prisma.$disconnect();
    process.exit(0);
  }

  // Modo Interativo (REPL)
  console.log('====================================================');
  console.log('  🗄️  Terminal SQL - Fluxo de Caixa (PostgreSQL)');
  console.log('  Comandos úteis:');
  console.log('    .tables       -> Lista todas as tabelas');
  console.log('    sair ou exit  -> Encerra o terminal SQL');
  console.log('====================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (['sair', 'exit', 'quit', '.exit'].includes(input.toLowerCase())) {
      rl.close();
      return;
    }

    if (input) {
      await executeQuery(input);
    }
    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('\nAté logo!');
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
