import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Criar usuários com senhas criptografadas (bcrypt)
  const leandroSenha = await bcrypt.hash('Lek002**', 10);
  const jipsyaSenha = await bcrypt.hash('toy02sushi02', 10);

  const uLeandro = await prisma.usuario.upsert({
    where: { username: 'leandrob' },
    update: { senha: leandroSenha },
    create: {
      username: 'leandrob',
      nome: 'Leandro',
      senha: leandroSenha,
      role: 'admin',
    },
  });

  const uJipsya = await prisma.usuario.upsert({
    where: { username: 'jipsyab' },
    update: { senha: jipsyaSenha },
    create: {
      username: 'jipsyab',
      nome: 'Jipsya',
      senha: jipsyaSenha,
      role: 'admin',
    },
  });

  console.log(`✅ Usuários criados/atualizados: ${uLeandro.username}, ${uJipsya.username}`);

  // 2. Se a tabela de investimentos estiver vazia, inserir dados de exemplo
  const countInvest = await prisma.investimento.count();
  if (countInvest === 0) {
    const hoje = new Date().toISOString().slice(0, 10);
    await prisma.investimento.createMany({
      data: [
        { banco: 'NUBANK', tipo: 'Caixinha Turbo', valor: 25000.00, dataAtualizacao: hoje },
        { banco: 'PICPAY', tipo: 'CDB 102% CDI', valor: 15400.00, dataAtualizacao: hoje },
        { banco: 'SWILE', tipo: 'Saldo Flexível', valor: 3200.00, dataAtualizacao: hoje },
        { banco: 'XP INVESTIMENTOS', tipo: 'Fundos Imobiliários & Ações', valor: 42800.00, dataAtualizacao: hoje },
      ],
    });
    console.log('✅ Investimentos iniciais inseridos com sucesso.');
  }

  // 3. Se a tabela de lançamentos estiver vazia, inserir alguns de exemplo para validação inicial
  const countLanc = await prisma.lancamento.count();
  if (countLanc === 0) {
    const anoAtual = new Date().getFullYear();
    const mesNumAtual = new Date().getMonth() + 1;
    const mesNumStr = String(mesNumAtual).padStart(2, '0');
    const mesesNomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mesNome = mesesNomes[mesNumAtual - 1];

    await prisma.lancamento.createMany({
      data: [
        {
          competencia: `${anoAtual}-${mesNumStr}-01`,
          dataLcto: `${anoAtual}-${mesNumStr}-05`,
          ano: anoAtual,
          mesNum: mesNumAtual,
          mes: mesNome,
          natureza: 'Receita',
          grupo: 'Receitas Operacionais',
          categoria: 'Consultoria',
          subcategoria: 'Excellence Consulting',
          responsavel: 'Leandro',
          valor: 14500.00,
          status: 'Realizado',
        },
        {
          competencia: `${anoAtual}-${mesNumStr}-01`,
          dataLcto: `${anoAtual}-${mesNumStr}-05`,
          ano: anoAtual,
          mesNum: mesNumAtual,
          mes: mesNome,
          natureza: 'Receita',
          grupo: 'Renda Fixa & Trabalho',
          categoria: 'Salário',
          subcategoria: 'Remuneração Jipsya',
          responsavel: 'Jipsya',
          valor: 8200.00,
          status: 'Realizado',
        },
        {
          competencia: `${anoAtual}-${mesNumStr}-01`,
          dataLcto: `${anoAtual}-${mesNumStr}-10`,
          ano: anoAtual,
          mesNum: mesNumAtual,
          mes: mesNome,
          natureza: 'Despesa',
          grupo: 'Habitação',
          categoria: 'Moradia',
          subcategoria: 'Aluguel / Condomínio',
          responsavel: 'Leandro',
          valor: -3200.00,
          status: 'Realizado',
        },
        {
          competencia: `${anoAtual}-${mesNumStr}-01`,
          dataLcto: `${anoAtual}-${mesNumStr}-15`,
          ano: anoAtual,
          mesNum: mesNumAtual,
          mes: mesNome,
          natureza: 'Despesa',
          grupo: 'Alimentação',
          categoria: 'Mercado',
          subcategoria: 'Supermercado Mensal',
          responsavel: 'Jipsya',
          valor: -1850.00,
          status: 'Realizado',
        },
        {
          competencia: `${anoAtual}-${mesNumStr}-01`,
          dataLcto: `${anoAtual}-${mesNumStr}-20`,
          ano: anoAtual,
          mesNum: mesNumAtual,
          mes: mesNome,
          natureza: 'Custo',
          grupo: 'Transporte',
          categoria: 'Veículo',
          subcategoria: 'Combustível / Seguro',
          responsavel: 'Leandro',
          valor: -950.00,
          status: 'Realizado',
        },
      ],
    });
    console.log('✅ Lançamentos de demonstração inseridos.');
  }

  console.log('✨ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
