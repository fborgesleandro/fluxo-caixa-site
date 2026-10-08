import { calcularDatasRecorrencia, gerarPreviaRecorrencia, formatarDataBr } from '../src/lib/recorrencia';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FALHA: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log('🧪 Testando regras de cálculo de recorrência...\n');

// Teste 1: Exemplo do usuário (10/01/2027 até 10/06/2027)
const t1 = calcularDatasRecorrencia('2027-01-10', '2027-06-10');
assert(t1.length === 6, 'Exemplo 1: Deve gerar exatamente 6 lançamentos');
assert(t1[0] === '2027-01-10', 'Exemplo 1: Mês 1 é 2027-01-10');
assert(t1[1] === '2027-02-10', 'Exemplo 1: Mês 2 é 2027-02-10');
assert(t1[2] === '2027-03-10', 'Exemplo 1: Mês 3 é 2027-03-10');
assert(t1[3] === '2027-04-10', 'Exemplo 1: Mês 4 é 2027-04-10');
assert(t1[4] === '2027-05-10', 'Exemplo 1: Mês 5 é 2027-05-10');
assert(t1[5] === '2027-06-10', 'Exemplo 1: Mês 6 é 2027-06-10');

// Teste 2: Dia 31 em ano normal (2027)
const t2 = calcularDatasRecorrencia('2027-01-31', '2027-05-31');
assert(t2.length === 5, 'Exemplo 2: Deve gerar 5 lançamentos');
assert(t2[0] === '2027-01-31', 'Exemplo 2: Janeiro tem dia 31');
assert(t2[1] === '2027-02-28', 'Exemplo 2: Fevereiro 2027 ajusta para dia 28');
assert(t2[2] === '2027-03-31', 'Exemplo 2: Março tem dia 31');
assert(t2[3] === '2027-04-30', 'Exemplo 2: Abril ajusta para dia 30');
assert(t2[4] === '2027-05-31', 'Exemplo 2: Maio tem dia 31');

// Teste 3: Dia 31 em ano bissexto (2028)
const t3 = calcularDatasRecorrencia('2028-01-31', '2028-03-31');
assert(t3.length === 3, 'Exemplo 3: Deve gerar 3 lançamentos');
assert(t3[0] === '2028-01-31', 'Exemplo 3: Janeiro 2028 tem dia 31');
assert(t3[1] === '2028-02-29', 'Exemplo 3: Fevereiro 2028 (bissexto) ajusta para dia 29');
assert(t3[2] === '2028-03-31', 'Exemplo 3: Março 2028 tem dia 31');

// Teste 4: Data final anterior à inicial
const t4 = calcularDatasRecorrencia('2027-05-10', '2027-01-10');
assert(t4.length === 0, 'Exemplo 4: Data final anterior retorna lista vazia');

// Teste 5: Cálculo da Prévia e Valores
const previa = gerarPreviaRecorrencia('2027-01-10', '2027-06-10', 500);
assert(previa.quantidade === 6, 'Prévia: Quantidade 6');
assert(previa.valorUnitario === 500, 'Prévia: Valor unitário R$ 500');
assert(previa.valorTotal === 3000, 'Prévia: Valor total R$ 3.000');
assert(formatarDataBr(previa.datas[0]) === '10/01/2027', 'Prévia: Formatação BR correta');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DE RECORRÊNCIA PASSARAM COM SUCESSO!\n');
