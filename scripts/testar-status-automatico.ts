import { prisma } from '../src/lib/db';
import {
  calcularStatusAutomatico,
  obterHojeISO,
  calcularDatasRecorrencia,
  gerarPreviaRecorrencia,
} from '../src/lib/recorrencia';

interface TestResult {
  nome: string;
  esperado: string | boolean;
  obtido: string | boolean;
  passou: boolean;
  detalhes?: string;
}

const resultados: TestResult[] = [];

function registrarResultado(nome: string, esperado: any, obtido: any, detalhes?: string) {
  const passou = esperado === obtido;
  resultados.push({ nome, esperado, obtido, passou, detalhes });
  const icone = passou ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`${icone}: ${nome} (Esperado: "${esperado}" | Obtido: "${obtido}")`);
  if (detalhes) console.log(`   Detalhe: ${detalhes}`);
}

async function executarTestes() {
  console.log('================================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES: STATUS AUTOMÁTICO DE LANÇAMENTOS');
  console.log('================================================================\n');

  const hoje = obterHojeISO();
  console.log(`📅 Data de Referência do Sistema (Hoje Local): ${hoje}\n`);

  // Calcular datas relativas para teste
  const dataHojeObj = new Date();
  
  const dPassada = new Date(dataHojeObj);
  dPassada.setDate(dPassada.getDate() - 15);
  const dataPassada = obterHojeISO(dPassada);

  const dFutura = new Date(dataHojeObj);
  dFutura.setDate(dFutura.getDate() + 15);
  const dataFutura = obterHojeISO(dFutura);

  console.log(`   - Data Passada: ${dataPassada}`);
  console.log(`   - Data Hoje:    ${hoje}`);
  console.log(`   - Data Futura:  ${dataFutura}\n`);

  // -------------------------------------------------------------
  // PARTE 1: TESTES UNITÁRIOS DA FUNÇÃO CENTRAL
  // -------------------------------------------------------------
  console.log('--- [PARTE 1] Testes Unitários da Função calcularStatusAutomatico ---');

  // 1. Despesa anterior a hoje → Pago
  registrarResultado(
    'Despesa anterior a hoje deve ser Pago',
    'Pago',
    calcularStatusAutomatico('Despesa', dataPassada, hoje)
  );

  // 2. Despesa hoje → À Pagar
  registrarResultado(
    'Despesa hoje deve ser À Pagar',
    'À Pagar',
    calcularStatusAutomatico('Despesa', hoje, hoje)
  );

  // 3. Despesa futura → À Pagar
  registrarResultado(
    'Despesa futura deve ser À Pagar',
    'À Pagar',
    calcularStatusAutomatico('Despesa', dataFutura, hoje)
  );

  // 4. Custo anterior a hoje → Pago
  registrarResultado(
    'Custo anterior a hoje deve ser Pago',
    'Pago',
    calcularStatusAutomatico('Custo', dataPassada, hoje)
  );

  // 5. Custo hoje → À Pagar
  registrarResultado(
    'Custo hoje deve ser À Pagar',
    'À Pagar',
    calcularStatusAutomatico('Custo', hoje, hoje)
  );

  // 6. Custo futuro → À Pagar
  registrarResultado(
    'Custo futuro deve ser À Pagar',
    'À Pagar',
    calcularStatusAutomatico('Custo', dataFutura, hoje)
  );

  // 7. Receita anterior a hoje → Recebido
  registrarResultado(
    'Receita anterior a hoje deve ser Recebido',
    'Recebido',
    calcularStatusAutomatico('Receita', dataPassada, hoje)
  );

  // 8. Receita hoje → À Receber
  registrarResultado(
    'Receita hoje deve ser À Receber',
    'À Receber',
    calcularStatusAutomatico('Receita', hoje, hoje)
  );

  // 9. Receita futura → À Receber
  registrarResultado(
    'Receita futura deve ser À Receber',
    'À Receber',
    calcularStatusAutomatico('Receita', dataFutura, hoje)
  );

  // -------------------------------------------------------------
  // PARTE 2: TESTES UNITÁRIOS DE RECORRÊNCIA COM LOTES MISTOS
  // -------------------------------------------------------------
  console.log('\n--- [PARTE 2] Testes de Recorrência com Lote Misto (Passado + Futuro) ---');

  // Simulação de Recorrência de Receita: 3 parcelas (mês passado, mês atual, mês que vem)
  const dtInicioRec = '2026-09-10';
  const dtFimRec = '2026-11-10';
  const hojeSimulado = '2026-10-07';

  const previaReceita = gerarPreviaRecorrencia(dtInicioRec, dtFimRec, 500, 'Receita', hojeSimulado);
  registrarResultado(
    'Recorrência Receita gera 3 parcelas',
    3,
    previaReceita.parcelas.length
  );
  registrarResultado(
    'Recorrência Receita parcela 1 (10/09/2026 < hoje) → Recebido',
    'Recebido',
    previaReceita.parcelas[0]?.status,
    `Data: ${previaReceita.parcelas[0]?.data}`
  );
  registrarResultado(
    'Recorrência Receita parcela 2 (10/10/2026 >= hoje) → À Receber',
    'À Receber',
    previaReceita.parcelas[1]?.status,
    `Data: ${previaReceita.parcelas[1]?.data}`
  );
  registrarResultado(
    'Recorrência Receita parcela 3 (10/11/2026 >= hoje) → À Receber',
    'À Receber',
    previaReceita.parcelas[2]?.status,
    `Data: ${previaReceita.parcelas[2]?.data}`
  );

  // Simulação de Recorrência de Despesa: 3 parcelas
  const previaDespesa = gerarPreviaRecorrencia('2026-10-05', '2026-12-05', 250, 'Despesa', hojeSimulado);
  registrarResultado(
    'Recorrência Despesa parcela 1 (05/10/2026 < hoje) → Pago',
    'Pago',
    previaDespesa.parcelas[0]?.status,
    `Data: ${previaDespesa.parcelas[0]?.data}`
  );
  registrarResultado(
    'Recorrência Despesa parcela 2 (05/11/2026 >= hoje) → À Pagar',
    'À Pagar',
    previaDespesa.parcelas[1]?.status,
    `Data: ${previaDespesa.parcelas[1]?.data}`
  );
  registrarResultado(
    'Recorrência Despesa parcela 3 (05/12/2026 >= hoje) → À Pagar',
    'À Pagar',
    previaDespesa.parcelas[2]?.status,
    `Data: ${previaDespesa.parcelas[2]?.data}`
  );

  // -------------------------------------------------------------
  // PARTE 3: TESTES DE INTEGRAÇÃO NO BANCO (NEON DEV BRANCH)
  // -------------------------------------------------------------
  console.log('\n--- [PARTE 3] Testes de Integração com Banco de Dados Neon (dev) ---');

  const contagemInicial = await prisma.lancamento.count();
  console.log(`📊 Contagem inicial de lançamentos no banco: ${contagemInicial}`);

  const idsCriadosParaLimpar: string[] = [];

  try {
    // 1. Criar novo lançamento Pontual com data passada (Despesa)
    const lctoDespesaPassada = await prisma.lancamento.create({
      data: {
        competencia: dataPassada,
        dataLcto: dataPassada,
        ano: Number(dataPassada.slice(0, 4)),
        mesNum: Number(dataPassada.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Despesa',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: -100,
        status: calcularStatusAutomatico('Despesa', dataPassada),
      },
    });
    idsCriadosParaLimpar.push(lctoDespesaPassada.id);
    registrarResultado(
      'Banco: Despesa anterior a hoje persistida como Pago',
      'Pago',
      lctoDespesaPassada.status
    );

    // 2. Criar novo lançamento Pontual com data de hoje (Despesa)
    const lctoDespesaHoje = await prisma.lancamento.create({
      data: {
        competencia: hoje,
        dataLcto: hoje,
        ano: Number(hoje.slice(0, 4)),
        mesNum: Number(hoje.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Despesa',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: -100,
        status: calcularStatusAutomatico('Despesa', hoje),
      },
    });
    idsCriadosParaLimpar.push(lctoDespesaHoje.id);
    registrarResultado(
      'Banco: Despesa hoje persistida como À Pagar',
      'À Pagar',
      lctoDespesaHoje.status
    );

    // 3. Criar novo lançamento Pontual com data futura (Despesa)
    const lctoDespesaFutura = await prisma.lancamento.create({
      data: {
        competencia: dataFutura,
        dataLcto: dataFutura,
        ano: Number(dataFutura.slice(0, 4)),
        mesNum: Number(dataFutura.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Despesa',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: -100,
        status: calcularStatusAutomatico('Despesa', dataFutura),
      },
    });
    idsCriadosParaLimpar.push(lctoDespesaFutura.id);
    registrarResultado(
      'Banco: Despesa futura persistida como À Pagar',
      'À Pagar',
      lctoDespesaFutura.status
    );

    // 4. Criar novo lançamento Pontual com data passada (Receita)
    const lctoReceitaPassada = await prisma.lancamento.create({
      data: {
        competencia: dataPassada,
        dataLcto: dataPassada,
        ano: Number(dataPassada.slice(0, 4)),
        mesNum: Number(dataPassada.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Receita',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: 200,
        status: calcularStatusAutomatico('Receita', dataPassada),
      },
    });
    idsCriadosParaLimpar.push(lctoReceitaPassada.id);
    registrarResultado(
      'Banco: Receita anterior a hoje persistida como Recebido',
      'Recebido',
      lctoReceitaPassada.status
    );

    // 5. Criar novo lançamento Pontual com data de hoje (Receita)
    const lctoReceitaHoje = await prisma.lancamento.create({
      data: {
        competencia: hoje,
        dataLcto: hoje,
        ano: Number(hoje.slice(0, 4)),
        mesNum: Number(hoje.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Receita',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: 200,
        status: calcularStatusAutomatico('Receita', hoje),
      },
    });
    idsCriadosParaLimpar.push(lctoReceitaHoje.id);
    registrarResultado(
      'Banco: Receita hoje persistida como À Receber',
      'À Receber',
      lctoReceitaHoje.status
    );

    // 6. Criar novo lançamento Pontual com data futura (Receita)
    const lctoReceitaFutura = await prisma.lancamento.create({
      data: {
        competencia: dataFutura,
        dataLcto: dataFutura,
        ano: Number(dataFutura.slice(0, 4)),
        mesNum: Number(dataFutura.slice(5, 7)),
        mes: 'mes_teste',
        natureza: 'Receita',
        grupo: 'TESTE_AUTOMATIZADO',
        categoria: 'TESTE',
        subcategoria: 'STATUS_AUTO',
        responsavel: 'TESTE_ROBOT',
        valor: 200,
        status: calcularStatusAutomatico('Receita', dataFutura),
      },
    });
    idsCriadosParaLimpar.push(lctoReceitaFutura.id);
    registrarResultado(
      'Banco: Receita futura persistida como À Receber',
      'À Receber',
      lctoReceitaFutura.status
    );

    // 7. Simular Recorrência em lote com datas mistas no banco
    const datasLote = [dataPassada, dataFutura];
    const loteInserido = await prisma.$transaction(async (tx) => {
      const arr = [];
      for (const dt of datasLote) {
        const item = await tx.lancamento.create({
          data: {
            competencia: dt,
            dataLcto: dt,
            ano: Number(dt.slice(0, 4)),
            mesNum: Number(dt.slice(5, 7)),
            mes: 'mes_recorrente',
            natureza: 'Despesa',
            grupo: 'TESTE_RECORRENTE',
            categoria: 'TESTE',
            subcategoria: 'STATUS_MISTO',
            responsavel: 'TESTE_ROBOT',
            valor: -50,
            status: calcularStatusAutomatico('Despesa', dt),
          },
        });
        arr.push(item);
      }
      return arr;
    });

    loteInserido.forEach((x) => idsCriadosParaLimpar.push(x.id));

    registrarResultado(
      'Banco Recorrência Mista: Item passado do lote gravado como Pago',
      'Pago',
      loteInserido[0].status
    );
    registrarResultado(
      'Banco Recorrência Mista: Item futuro do lote gravado como À Pagar',
      'À Pagar',
      loteInserido[1].status
    );
    registrarResultado(
      'Banco Recorrência Mista: Itens do mesmo lote possuem status distintos de acordo com dataLcto',
      true,
      loteInserido[0].status !== loteInserido[1].status,
      `Passado=${loteInserido[0].status}, Futuro=${loteInserido[1].status}`
    );

    // 8. Teste de Edição: Mudar lançamento futuro para data passada deve recalcular À Pagar → Pago
    const novaDataParaPassado = dataPassada;
    const lctoAtualizadoParaPassado = await prisma.lancamento.update({
      where: { id: lctoDespesaFutura.id },
      data: {
        dataLcto: novaDataParaPassado,
        status: calcularStatusAutomatico('Despesa', novaDataParaPassado),
      },
    });

    registrarResultado(
      'Edição: Lançamento futuro editado para data passada recalcula À Pagar → Pago',
      'Pago',
      lctoAtualizadoParaPassado.status
    );

    // 9. Teste de Edição: Mudar lançamento passado para data futura deve recalcular Pago → À Pagar
    const novaDataParaFuturo = dataFutura;
    const lctoAtualizadoParaFuturo = await prisma.lancamento.update({
      where: { id: lctoDespesaPassada.id },
      data: {
        dataLcto: novaDataParaFuturo,
        status: calcularStatusAutomatico('Despesa', novaDataParaFuturo),
      },
    });

    registrarResultado(
      'Edição: Lançamento passado editado para data futura recalcula Pago → À Pagar',
      'À Pagar',
      lctoAtualizadoParaFuturo.status
    );

  } finally {
    // Limpeza de todos os registros de teste
    console.log(`\n🧹 Limpando ${idsCriadosParaLimpar.length} registros temporários de teste...`);
    if (idsCriadosParaLimpar.length > 0) {
      await prisma.lancamento.deleteMany({
        where: { id: { in: idsCriadosParaLimpar } },
      });
    }

    const contagemFinal = await prisma.lancamento.count();
    console.log(`📊 Contagem final de lançamentos no banco: ${contagemFinal}`);
    registrarResultado(
      'Integridade do Banco: Contagem final é exatamente igual à contagem inicial',
      contagemInicial,
      contagemFinal
    );
  }

  // -------------------------------------------------------------
  // RELATÓRIO CONSOLIDADO
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📋 RESUMO DOS RESULTADOS DOS TESTES');
  console.log('================================================================');
  const falhas = resultados.filter((r) => !r.passou);
  console.log(`Total de testes executados: ${resultados.length}`);
  console.log(`Sucessos: ${resultados.length - falhas.length}`);
  console.log(`Falhas: ${falhas.length}`);

  if (falhas.length > 0) {
    console.log('\n❌ ATENÇÃO: HOUVE FALHAS:');
    falhas.forEach((f) => console.log(` - ${f.nome}: Esperado "${f.esperado}", Obtido "${f.obtido}"`));
    process.exit(1);
  } else {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
    process.exit(0);
  }
}

executarTestes()
  .catch((e) => {
    console.error('❌ Erro na execução dos testes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
