/**
 * Utilitários para cálculo de recorrência e status automático de lançamentos
 */

export interface ParcelaPrevia {
  data: string;
  dataBr: string;
  status: string;
}

export interface PreviaRecorrencia {
  quantidade: number;
  dataInicio: string;
  dataFim: string;
  valorUnitario: number;
  valorTotal: number;
  datas: string[];
  parcelas: ParcelaPrevia[];
}

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando a data local (sem desvios de fuso/UTC)
 */
export function obterHojeISO(referencia?: Date): string {
  const d = referencia || new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula o STATUS automaticamente com base na Data de Lançamento e na Natureza:
 *
 * Para Natureza = Despesa ou Custo:
 *   DATA LCTO < hoje()  → 'Pago'
 *   DATA LCTO >= hoje() → 'À Pagar'
 *
 * Para Natureza = Receita:
 *   DATA LCTO < hoje()  → 'Recebido'
 *   DATA LCTO >= hoje() → 'À Receber'
 *
 * @param natureza - 'Despesa', 'Receita' ou 'Custo'
 * @param dataLcto - Data no formato YYYY-MM-DD
 * @param hojeRef - Data de referência opcional para testes ou simulações (YYYY-MM-DD)
 */
export function calcularStatusAutomatico(
  natureza: string,
  dataLcto: string,
  hojeRef?: string
): string {
  const hoje = hojeRef || obterHojeISO();
  const natNorm = String(natureza || '').toLowerCase().trim();
  const dataLimpa = String(dataLcto || '').trim().slice(0, 10);

  if (!dataLimpa) {
    return natNorm === 'receita' ? 'À Receber' : 'À Pagar';
  }

  if (natNorm === 'receita') {
    return dataLimpa < hoje ? 'Recebido' : 'À Receber';
  } else {
    // Despesa, Custo ou outros
    return dataLimpa < hoje ? 'Pago' : 'À Pagar';
  }
}

/**
 * Calcula a lista de datas mensais de dataInicioStr até dataFimStr.
 * Utiliza o mesmo dia da Data Inicial.
 * Se o dia não existir no mês correspondente (ex: dia 31 em fevereiro ou abril),
 * utiliza o último dia válido daquele mês (28/02, 29/02 em ano bissexto, 30/04, etc.).
 */
export function calcularDatasRecorrencia(dataInicioStr: string, dataFimStr: string): string[] {
  if (!dataInicioStr || !dataFimStr) return [];
  if (dataInicioStr > dataFimStr) return [];

  const [anoIni, mesIni, diaIni] = dataInicioStr.split('-').map(Number);
  const [anoFim, mesFim, diaFim] = dataFimStr.split('-').map(Number);

  if (!anoIni || !mesIni || !diaIni || !anoFim || !mesFim || !diaFim) return [];

  const datas: string[] = [];

  let curAno = anoIni;
  let curMes = mesIni; // 1 a 12

  while (true) {
    // Se curAno ultrapassou o ano final ou (mesmo ano e mês ultrapassou o mês final), encerra
    if (curAno > anoFim || (curAno === anoFim && curMes > mesFim)) {
      break;
    }

    // Último dia do mês curMes no ano curAno:
    // Em JavaScript, new Date(ano, mes, 0) com mes 1-indexed retorna o último dia do mês
    const ultimoDiaDoMes = new Date(curAno, curMes, 0).getDate();
    const diaReal = Math.min(diaIni, ultimoDiaDoMes);

    const mesStr = String(curMes).padStart(2, '0');
    const diaStr = String(diaReal).padStart(2, '0');
    const dataGerada = `${curAno}-${mesStr}-${diaStr}`;

    // Se no mês final a data calculada ultrapassar a dataFim exata, para
    if (dataGerada > dataFimStr) {
      break;
    }

    datas.push(dataGerada);

    // Próximo mês
    curMes++;
    if (curMes > 12) {
      curMes = 1;
      curAno++;
    }
  }

  return datas;
}

/**
 * Formata data ISO (YYYY-MM-DD) para exibição legível brasileira (DD/MM/YYYY)
 */
export function formatarDataBr(dataIso: string): string {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}

/**
 * Gera a prévia consolidada da recorrência com cálculos de quantidade, valores e status individual
 */
export function gerarPreviaRecorrencia(
  dataInicio: string,
  dataFim: string,
  valorUnitario: number,
  natureza: string = 'Despesa',
  hojeRef?: string
): PreviaRecorrencia {
  const datas = calcularDatasRecorrencia(dataInicio, dataFim);
  const quantidade = datas.length;
  const valorUnitarioAbs = Math.abs(Number(valorUnitario) || 0);
  const valorTotal = quantidade * valorUnitarioAbs;

  const parcelas: ParcelaPrevia[] = datas.map((dt) => ({
    data: dt,
    dataBr: formatarDataBr(dt),
    status: calcularStatusAutomatico(natureza, dt, hojeRef),
  }));

  return {
    quantidade,
    dataInicio,
    dataFim,
    valorUnitario: valorUnitarioAbs,
    valorTotal,
    datas,
    parcelas,
  };
}
