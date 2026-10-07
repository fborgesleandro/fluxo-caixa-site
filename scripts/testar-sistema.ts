import { prisma } from '../src/lib/db';
import { verificarSenha, criarToken, verificarToken } from '../src/lib/auth';

async function main() {
  console.log('🧪 Iniciando Bateria Completa de Testes Funcionais...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Falha no teste: ${testName}`);
    }
  }

  // 1. Teste de Autenticação
  console.log('--- 1. Autenticação e Usuários ---');
  const userLeandro = await prisma.usuario.findUnique({ where: { username: 'leandrob' } });
  assert(!!userLeandro, 'Usuário leandrob encontrado no banco');
  const passOkLeandro = await verificarSenha('Lek002**', userLeandro!.senha);
  assert(passOkLeandro, 'Senha de leandrob validada com sucesso pelo bcrypt');

  const userJipsya = await prisma.usuario.findUnique({ where: { username: 'jipsyab' } });
  assert(!!userJipsya, 'Usuário jipsyab encontrado no banco');
  const passOkJipsya = await verificarSenha('toy02sushi02', userJipsya!.senha);
  assert(passOkJipsya, 'Senha de jipsyab validada com sucesso pelo bcrypt');

  // Teste de JWT com o novo JWT_SECRET
  const token = await criarToken({
    userId: userLeandro!.id,
    username: userLeandro!.username,
    nome: userLeandro!.nome,
    role: userLeandro!.role,
  });
  assert(typeof token === 'string' && token.length > 20, 'Geração de JWT com novo secret seguro');
  const payload = await verificarToken(token);
  assert(payload?.username === 'leandrob', 'Verificação e decodificação do JWT válida');

  // 2. Teste de Leitura e Contagem
  console.log('\n--- 2. Leitura e Integridade Histórica ---');
  const totalLanc = await prisma.lancamento.count();
  assert(totalLanc >= 580, `Lançamentos carregados no PostgreSQL (${totalLanc} >= 580)`);

  const totalInvest = await prisma.investimento.count();
  assert(totalInvest === 6, `Investimentos carregados no PostgreSQL (${totalInvest} === 6)`);

  // 3. Teste de Dashboards e Agregações
  console.log('\n--- 3. Dashboards e Agregações ---');
  const receitas = await prisma.lancamento.aggregate({
    _sum: { valor: true },
    where: { natureza: 'Receita' },
  });
  const despesas = await prisma.lancamento.aggregate({
    _sum: { valor: true },
    where: { natureza: { in: ['Despesa', 'Custo'] } },
  });
  assert((receitas._sum.valor || 0) > 0, `Cálculo de Receitas operacionais: R$ ${(receitas._sum.valor || 0).toFixed(2)}`);
  assert((despesas._sum.valor || 0) < 0, `Cálculo de Despesas/Custos: R$ ${(despesas._sum.valor || 0).toFixed(2)}`);

  const totalPatrimonio = await prisma.investimento.aggregate({
    _sum: { valor: true },
  });
  assert((totalPatrimonio._sum.valor || 0) > 0, `Cálculo de Patrimônio Líquido em Investimentos: R$ ${(totalPatrimonio._sum.valor || 0).toFixed(2)}`);

  // 4. Teste de Filtros
  console.log('\n--- 4. Filtros ---');
  const lancamentos2026 = await prisma.lancamento.findMany({
    where: { ano: 2026 },
    take: 5,
  });
  assert(lancamentos2026.length > 0, `Filtro por Ano 2026 retornou registros com sucesso`);

  const lancamentosResp = await prisma.lancamento.findMany({
    where: { responsavel: 'Leandro' },
    take: 5,
  });
  assert(lancamentosResp.length > 0, `Filtro por Responsável "Leandro" retornou registros`);

  // 5. Teste de Ciclo Completo (CRUD): Inclusão, Edição e Exclusão
  console.log('\n--- 5. Ciclo CRUD (Inclusão, Edição, Exclusão) ---');
  const testeId = 'teste-migracao-temp-' + Date.now();
  const novo = await prisma.lancamento.create({
    data: {
      id: testeId,
      competencia: '2026-10-01',
      dataLcto: '2026-10-06',
      ano: 2026,
      mesNum: 10,
      mes: 'out',
      natureza: 'Despesa',
      grupo: 'Teste Migração',
      categoria: 'Homologação',
      subcategoria: 'Verificação Neon',
      responsavel: 'Leandro',
      valor: -150.00,
      status: 'Pago',
      observacao: 'Registro de teste automatizado para validação do PostgreSQL',
    },
  });
  assert(novo.id === testeId, 'Inclusão de novo lançamento no PostgreSQL realizada');

  const editado = await prisma.lancamento.update({
    where: { id: testeId },
    data: {
      valor: -200.00,
      observacao: 'Registro de teste alterado com sucesso',
    },
  });
  assert(editado.valor === -200.00, 'Edição de lançamento persistida com sucesso');

  const excluido = await prisma.lancamento.delete({
    where: { id: testeId },
  });
  assert(excluido.id === testeId, 'Exclusão do lançamento de teste concluída com sucesso');

  const buscaExcluido = await prisma.lancamento.findUnique({ where: { id: testeId } });
  assert(!buscaExcluido, 'Confirmação de que o registro excluído não existe mais');

  // 6. Verificação final de integridade
  console.log('\n--- 6. Verificação de Integridade Final ---');
  const finalLanc = await prisma.lancamento.count();
  assert(finalLanc === 580, `Contagem final de lançamentos restaurada para exatamente 580`);

  console.log('\n======================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES FUNCIONAIS FORAM APROVADOS COM SUCESSO!`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('\n❌ ERRO NOS TESTES:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
