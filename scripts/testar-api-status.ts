import 'dotenv/config';
import { criarToken } from '../src/lib/auth';
import { obterHojeISO } from '../src/lib/recorrencia';

async function testarApiHttp() {
  console.log('================================================================');
  console.log('🌐 TESTE END-TO-END HTTP: API /api/lancamentos E RECORRÊNCIA');
  console.log('================================================================\n');

  // Gerar token de autenticação válido
  const token = await criarToken({
    userId: 'test-runner',
    username: 'admin',
    nome: 'Administrador de Teste',
    role: 'admin',
  });

  const cookieHeader = `fcx_token=${token}`;
  const baseUrl = 'http://localhost:3000';

  const hoje = obterHojeISO();
  const dPassada = '2026-09-15';
  const dFutura = '2026-11-15';

  const idsParaLimpar: string[] = [];

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  };

  try {
    // 1. POST /api/lancamentos - Despesa no passado sem enviar status
    console.log('1. Testando POST /api/lancamentos: Despesa com data passada...');
    const res1 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: dPassada,
        natureza: 'Despesa',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 150,
      }),
    });
    const json1 = await res1.json();
    console.log('   Resposta:', res1.status, json1?.registro?.status);
    if (!res1.ok || json1?.registro?.status !== 'Pago') {
      throw new Error(`Falha no teste 1: esperado "Pago", obtido "${json1?.registro?.status}"`);
    }
    idsParaLimpar.push(json1.registro.id);
    console.log('   ✅ Despesa anterior a hoje → Status "Pago" gerado com sucesso via API!');

    // 2. POST /api/lancamentos - Despesa hoje sem enviar status
    console.log('2. Testando POST /api/lancamentos: Despesa com data de hoje...');
    const res2 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: hoje,
        natureza: 'Despesa',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 150,
      }),
    });
    const json2 = await res2.json();
    console.log('   Resposta:', res2.status, json2?.registro?.status);
    if (!res2.ok || json2?.registro?.status !== 'À Pagar') {
      throw new Error(`Falha no teste 2: esperado "À Pagar", obtido "${json2?.registro?.status}"`);
    }
    idsParaLimpar.push(json2.registro.id);
    console.log('   ✅ Despesa hoje → Status "À Pagar" gerado com sucesso via API!');

    // 3. POST /api/lancamentos - Despesa futura sem enviar status
    console.log('3. Testando POST /api/lancamentos: Despesa com data futura...');
    const res3 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: dFutura,
        natureza: 'Despesa',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 150,
      }),
    });
    const json3 = await res3.json();
    console.log('   Resposta:', res3.status, json3?.registro?.status);
    if (!res3.ok || json3?.registro?.status !== 'À Pagar') {
      throw new Error(`Falha no teste 3: esperado "À Pagar", obtido "${json3?.registro?.status}"`);
    }
    idsParaLimpar.push(json3.registro.id);
    console.log('   ✅ Despesa futura → Status "À Pagar" gerado com sucesso via API!');

    // 4. POST /api/lancamentos - Receita no passado sem enviar status
    console.log('4. Testando POST /api/lancamentos: Receita com data passada...');
    const res4 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: dPassada,
        natureza: 'Receita',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 300,
      }),
    });
    const json4 = await res4.json();
    console.log('   Resposta:', res4.status, json4?.registro?.status);
    if (!res4.ok || json4?.registro?.status !== 'Recebido') {
      throw new Error(`Falha no teste 4: esperado "Recebido", obtido "${json4?.registro?.status}"`);
    }
    idsParaLimpar.push(json4.registro.id);
    console.log('   ✅ Receita anterior a hoje → Status "Recebido" gerado com sucesso via API!');

    // 5. POST /api/lancamentos - Receita hoje sem enviar status
    console.log('5. Testando POST /api/lancamentos: Receita com data de hoje...');
    const res5 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: hoje,
        natureza: 'Receita',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 300,
      }),
    });
    const json5 = await res5.json();
    console.log('   Resposta:', res5.status, json5?.registro?.status);
    if (!res5.ok || json5?.registro?.status !== 'À Receber') {
      throw new Error(`Falha no teste 5: esperado "À Receber", obtido "${json5?.registro?.status}"`);
    }
    idsParaLimpar.push(json5.registro.id);
    console.log('   ✅ Receita hoje → Status "À Receber" gerado com sucesso via API!');

    // 6. POST /api/lancamentos - Receita futura sem enviar status
    console.log('6. Testando POST /api/lancamentos: Receita com data futura...');
    const res6 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataLcto: dFutura,
        natureza: 'Receita',
        grupo: 'API_TEST',
        categoria: 'TESTE',
        subcategoria: 'AUTO',
        responsavel: 'ROBOT',
        valor: 300,
      }),
    });
    const json6 = await res6.json();
    console.log('   Resposta:', res6.status, json6?.registro?.status);
    if (!res6.ok || json6?.registro?.status !== 'À Receber') {
      throw new Error(`Falha no teste 6: esperado "À Receber", obtido "${json6?.registro?.status}"`);
    }
    idsParaLimpar.push(json6.registro.id);
    console.log('   ✅ Receita futura → Status "À Receber" gerado com sucesso via API!');

    // 7. Edição: Mudar lançamento futuro (registro 3) para data passada
    console.log('7. Testando Edição via POST /api/lancamentos: Mudar lançamento de futura para passada...');
    const res7 = await fetch(`${baseUrl}/api/lancamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: json3.registro.id,
        dataLcto: dPassada, // alterou para o passado
        natureza: 'Despesa',
        valor: 150,
      }),
    });
    const json7 = await res7.json();
    console.log('   Resposta:', res7.status, json7?.registro?.status);
    if (!res7.ok || json7?.registro?.status !== 'Pago') {
      throw new Error(`Falha no teste 7: esperado "Pago", obtido "${json7?.registro?.status}"`);
    }
    console.log('   ✅ Edição recalcula automaticamente "À Pagar" → "Pago" com sucesso!');

    // 8. Teste de Recorrência HTTP: POST /api/lancamentos/recorrente
    console.log('8. Testando POST /api/lancamentos/recorrente: Lote contendo datas passadas e futuras...');
    const resRec = await fetch(`${baseUrl}/api/lancamentos/recorrente`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataInicio: '2026-08-10',
        dataFim: '2026-11-10',
        natureza: 'Despesa',
        grupo: 'RECORRENTE_TEST',
        categoria: 'TESTE',
        subcategoria: 'LOTE',
        responsavel: 'ROBOT',
        valor: 80,
      }),
    });
    const jsonRec = await resRec.json();
    console.log('   Resposta recorrência:', resRec.status, jsonRec?.quantidadeCriada);
    if (!resRec.ok || !jsonRec?.sucesso || !jsonRec?.registros) {
      throw new Error(`Falha no teste de recorrência: ${jsonRec?.erro}`);
    }

    const criadosRec = jsonRec.registros;
    criadosRec.forEach((r: any) => idsParaLimpar.push(r.id));

    // Validar status individual de cada lançamento gerado no lote:
    // 2026-08-10 < hoje -> Pago
    // 2026-09-10 < hoje -> Pago
    // 2026-10-10 >= hoje -> À Pagar
    // 2026-11-10 >= hoje -> À Pagar
    console.log('   Lançamentos criados no lote:');
    criadosRec.forEach((r: any) => {
      console.log(`     - Data: ${r.dataLcto} | Status: ${r.status}`);
    });

    const regAgo = criadosRec.find((r: any) => r.dataLcto === '2026-08-10');
    const regSet = criadosRec.find((r: any) => r.dataLcto === '2026-09-10');
    const regOut = criadosRec.find((r: any) => r.dataLcto === '2026-10-10');
    const regNov = criadosRec.find((r: any) => r.dataLcto === '2026-11-10');

    if (regAgo?.status !== 'Pago') throw new Error(`2026-08-10 deveria ser "Pago", obtido: ${regAgo?.status}`);
    if (regSet?.status !== 'Pago') throw new Error(`2026-09-10 deveria ser "Pago", obtido: ${regSet?.status}`);
    if (regOut?.status !== 'À Pagar') throw new Error(`2026-10-10 deveria ser "À Pagar", obtido: ${regOut?.status}`);
    if (regNov?.status !== 'À Pagar') throw new Error(`2026-11-10 deveria ser "À Pagar", obtido: ${regNov?.status}`);

    console.log('   ✅ Lote recorrente validado: statuses individuais ("Pago" para passados e "À Pagar" para futuros)!');

  } finally {
    console.log(`\n🧹 Removendo ${idsParaLimpar.length} lançamentos de teste criados via HTTP...`);
    for (const id of idsParaLimpar) {
      await fetch(`${baseUrl}/api/lancamentos?id=${id}`, {
        method: 'DELETE',
        headers,
      });
    }
    console.log('✅ Base de dados de desenvolvimento limpa e restaurada!');
  }

  console.log('\n🎉 TODOS OS TESTES HTTP DA API PASSARAM COM SUCESSO!\n');
}

testarApiHttp().catch((e) => {
  console.error('❌ Erro no teste HTTP:', e);
  process.exit(1);
});
