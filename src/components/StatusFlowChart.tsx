'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Maximize2, Minimize2, Check, X, Info } from 'lucide-react';
import { LancamentoItem } from './CashFlowChart';

interface StatusFlowChartProps {
  dados: LancamentoItem[];
  expandido: boolean;
  onToggleExpand: (novoEstado: boolean) => void;
  abaAtiva?: 'evolucao' | 'status';
  onMudarAba?: (aba: 'evolucao' | 'status') => void;
}

// Cores refinadas e suaves (com laranja claro menos estridente)
const COR_RECEBIDO = '#10B981';   // Verde contínuo firme
const COR_A_RECEBER = '#34D399';  // Verde suave tracejado
const COR_PAGO = '#FB923C';       // Laranja claro e suave (substitui o #F97316 estridente)
const COR_A_PAGAR = '#FDBA74';    // Laranja pastel claro suave tracejado

function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatarData(dataStr: string): string {
  if (!dataStr) return '';
  const partes = String(dataStr).split('-');
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function moedaCurta(valor: number): string {
  const num = Number(valor) || 0;
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  }
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// Formatação precisa para rótulo de dados no formato "0.000,00" (ex: 19.532,24)
function formatarRotulo(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function gerarTicks(min: number, max: number, quantidade: number): number[] {
  const intervalo = (max - min) / Math.max(1, quantidade - 1);
  const bruto = Math.pow(10, Math.floor(Math.log10(Math.abs(intervalo) || 1)));
  const passo = Math.ceil(intervalo / bruto) * bruto || 100;
  const inicio = Math.floor(min / passo) * passo;
  const ticks: number[] = [];

  for (let val = inicio; val <= max + passo; val += passo) {
    if (val >= min && val <= max) ticks.push(val);
  }
  return ticks;
}

export default function StatusFlowChart({
  dados,
  expandido,
  onToggleExpand,
  abaAtiva = 'status',
  onMudarAba,
}: StatusFlowChartProps) {
  const [modo, setModo] = useState<'acumulado' | 'diario'>('acumulado');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipVisivel, setTooltipVisivel] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  // Seleção de linhas ativas
  const [linhasAtivas, setLinhasAtivas] = useState({
    recebido: true,
    aReceber: true,
    pago: true,
    aPagar: true,
  });

  const toggleLinha = (chave: keyof typeof linhasAtivas) => {
    setLinhasAtivas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  const selecionarTodos = () => {
    setLinhasAtivas({
      recebido: true,
      aReceber: true,
      pago: true,
      aPagar: true,
    });
  };

  const desmarcarTodos = () => {
    setLinhasAtivas({
      recebido: false,
      aReceber: false,
      pago: false,
      aPagar: false,
    });
  };

  const nenhumaLinhaAtiva = !Object.values(linhasAtivas).some(Boolean);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(600, containerRef.current.clientWidth));
      }
    };
    updateWidth();

    const ro = new ResizeObserver(() => {
      updateWidth();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [expandido]);

  // Agrupamento diário dos 4 status
  const dias = useMemo(() => {
    const porDia: Record<
      string,
      {
        data: string;
        label: string;
        ano: string;
        recebido: number;
        aReceber: number;
        pago: number;
        aPagar: number;
        recebidoItens: { nome: string; valor: number }[];
        aReceberItens: { nome: string; valor: number }[];
        pagoItens: { nome: string; valor: number }[];
        aPagarItens: { nome: string; valor: number }[];
        accRecebido: number;
        accAReceber: number;
        accPago: number;
        accAPagar: number;
        recebidoAcumLista: { nome: string; valor: number }[];
        aReceberAcumLista: { nome: string; valor: number }[];
        pagoAcumLista: { nome: string; valor: number }[];
        aPagarAcumLista: { nome: string; valor: number }[];
        totalSaidasAcumLista: { nome: string; valor: number }[];
        totalEntradasAcumLista: { nome: string; valor: number }[];
      }
    > = {};

    dados.forEach((x) => {
      if (!x.dataLcto) return;
      const chave = String(x.dataLcto);
      if (!porDia[chave]) {
        porDia[chave] = {
          data: chave,
          label: formatarData(chave).slice(0, 5),
          ano: chave.slice(0, 4),
          recebido: 0,
          aReceber: 0,
          pago: 0,
          aPagar: 0,
          recebidoItens: [],
          aReceberItens: [],
          pagoItens: [],
          aPagarItens: [],
          accRecebido: 0,
          accAReceber: 0,
          accPago: 0,
          accAPagar: 0,
          recebidoAcumLista: [],
          aReceberAcumLista: [],
          pagoAcumLista: [],
          aPagarAcumLista: [],
          totalSaidasAcumLista: [],
          totalEntradasAcumLista: [],
        };
      }

      const nat = normalizar(x.natureza);
      const st = normalizar(x.status);
      const valAbs = Math.abs(Number(x.valor) || 0);
      const nome = x.subcategoria || x.categoria || x.grupo || 'Geral';

      if (nat === 'receita') {
        if (st.includes('receber')) {
          porDia[chave].aReceber += valAbs;
          porDia[chave].aReceberItens.push({ nome, valor: valAbs });
        } else {
          porDia[chave].recebido += valAbs;
          porDia[chave].recebidoItens.push({ nome, valor: valAbs });
        }
      } else {
        // Despesa ou Custo
        if (st.includes('pagar')) {
          porDia[chave].aPagar += valAbs;
          porDia[chave].aPagarItens.push({ nome, valor: valAbs });
        } else {
          porDia[chave].pago += valAbs;
          porDia[chave].pagoItens.push({ nome, valor: valAbs });
        }
      }
    });

    const chaves = Object.keys(porDia).sort();
    let accRec = 0;
    let accARec = 0;
    let accPag = 0;
    let accAPag = 0;

    const mapaRec: Record<string, number> = {};
    const mapaARec: Record<string, number> = {};
    const mapaPag: Record<string, number> = {};
    const mapaAPag: Record<string, number> = {};
    const mapaTotalSaidas: Record<string, number> = {};
    const mapaTotalEntradas: Record<string, number> = {};

    return chaves.map((k) => {
      const item = porDia[k];
      accRec += item.recebido;
      accARec += item.aReceber;
      accPag += item.pago;
      accAPag += item.aPagar;

      item.recebidoItens.forEach((e) => {
        mapaRec[e.nome] = (mapaRec[e.nome] || 0) + e.valor;
        mapaTotalEntradas[e.nome] = (mapaTotalEntradas[e.nome] || 0) + e.valor;
      });
      item.aReceberItens.forEach((e) => {
        mapaARec[e.nome] = (mapaARec[e.nome] || 0) + e.valor;
        mapaTotalEntradas[e.nome] = (mapaTotalEntradas[e.nome] || 0) + e.valor;
      });
      item.pagoItens.forEach((s) => {
        mapaPag[s.nome] = (mapaPag[s.nome] || 0) + s.valor;
        mapaTotalSaidas[s.nome] = (mapaTotalSaidas[s.nome] || 0) + s.valor;
      });
      item.aPagarItens.forEach((s) => {
        mapaAPag[s.nome] = (mapaAPag[s.nome] || 0) + s.valor;
        mapaTotalSaidas[s.nome] = (mapaTotalSaidas[s.nome] || 0) + s.valor;
      });

      // No modo acumulado:
      // - Pago: valor que já foi efetivamente pago até aquela data
      // - À Pagar: trajetória TOTAL dos compromissos de saídas (Pago + À Pagar),
      //   garantindo que o valor já pago NÃO reduza a previsão total de saídas do mês.
      // - Recebido: valor efetivamente recebido
      // - À Receber: trajetória TOTAL prevista de entradas (Recebido + À Receber)
      item.accRecebido = accRec;
      item.accAReceber = accRec + accARec;
      item.accPago = accPag;
      item.accAPagar = accPag + accAPag;

      item.recebidoAcumLista = Object.keys(mapaRec)
        .map((nome) => ({ nome, valor: mapaRec[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.aReceberAcumLista = Object.keys(mapaARec)
        .map((nome) => ({ nome, valor: mapaARec[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.pagoAcumLista = Object.keys(mapaPag)
        .map((nome) => ({ nome, valor: mapaPag[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.aPagarAcumLista = Object.keys(mapaAPag)
        .map((nome) => ({ nome, valor: mapaAPag[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.totalSaidasAcumLista = Object.keys(mapaTotalSaidas)
        .map((nome) => ({ nome, valor: mapaTotalSaidas[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.totalEntradasAcumLista = Object.keys(mapaTotalEntradas)
        .map((nome) => ({ nome, valor: mapaTotalEntradas[nome] }))
        .sort((a, b) => b.valor - a.valor);

      return item;
    });
  }, [dados]);

  // Encontra os índices da última data com lançamento recebido e pago
  const ultimoDiaRecebidoIdx = useMemo(() => {
    for (let i = dias.length - 1; i >= 0; i--) {
      if (dias[i].recebido > 0) return i;
    }
    return -1;
  }, [dias]);

  const ultimoDiaPagoIdx = useMemo(() => {
    for (let i = dias.length - 1; i >= 0; i--) {
      if (dias[i].pago > 0) return i;
    }
    return -1;
  }, [dias]);

  if (dias.length === 0) {
    return (
      <div className={`chart-box line-chart-box ${expandido ? 'expanded' : ''}`}>
        <div className="chart-title-row">
          <div className="section-title">Evolução por Status</div>
          {onMudarAba && (
            <div className="chart-tabs-nav">
              <button
                className="chart-tab-btn"
                onClick={() => onMudarAba('evolucao')}
              >
                Geral (Entradas / Saídas)
              </button>
              <button className="chart-tab-btn active">
                Por Status (Pago vs À Pagar)
              </button>
            </div>
          )}
        </div>
        <div className="empty">Sem lançamentos com Data LCTO para exibir.</div>
      </div>
    );
  }

  const width = containerWidth;
  const height = expandido ? 520 : 315;
  // Margens ajustadas para dar respiro aos rótulos de dados
  const margin = {
    top: 25,
    right: modo === 'acumulado' ? 160 : 35,
    bottom: 48,
    left: 80,
  };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Escala dinâmica considerando apenas as linhas visíveis
  const valores: number[] = [];
  dias.forEach((d, i) => {
    if (modo === 'acumulado') {
      if (linhasAtivas.recebido && i <= ultimoDiaRecebidoIdx) valores.push(d.accRecebido);
      if (linhasAtivas.aReceber) valores.push(d.accAReceber);
      if (linhasAtivas.pago && i <= ultimoDiaPagoIdx) valores.push(d.accPago);
      if (linhasAtivas.aPagar) valores.push(d.accAPagar);
    } else {
      if (linhasAtivas.recebido) valores.push(d.recebido);
      if (linhasAtivas.aReceber) valores.push(d.aReceber);
      if (linhasAtivas.pago) valores.push(d.pago);
      if (linhasAtivas.aPagar) valores.push(d.aPagar);
    }
  });

  const minVal = valores.length > 0 ? Math.min(0, Math.min(...valores)) : 0;
  const maxVal = valores.length > 0 ? Math.max(0, Math.max(...valores)) : 100;
  const pad = Math.max((maxVal - minVal) * 0.12, 100);
  const yMin = minVal;
  const yMax = maxVal + pad;

  const xCoord = (index: number) =>
    margin.left + (plotW * index) / Math.max(1, dias.length - 1);
  const yCoord = (valor: number) =>
    margin.top + ((yMax - valor) / Math.max(1, yMax - yMin)) * plotH;

  const ticks = gerarTicks(yMin, yMax, 5);

  // Gerador de caminho SVG com suporte a corte de limite de índice
  const caminhoLinha = (valorFn: (d: (typeof dias)[0]) => number, maxIdx?: number) => {
    const limite = maxIdx !== undefined ? maxIdx : dias.length - 1;
    if (limite < 0) return '';
    const subset = dias.slice(0, limite + 1);
    return subset
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCoord(i)} ${yCoord(valorFn(d))}`)
      .join(' ');
  };

  // Marcador da linha de hoje
  const hojeStr = new Date().toISOString().slice(0, 10);
  const dataIni = dias[0]?.data || '';
  const dataFim = dias[dias.length - 1]?.data || '';
  const tempoIni = new Date(dataIni).getTime();
  const tempoFim = new Date(dataFim).getTime();
  const tempoHoje = new Date(hojeStr).getTime();
  const hojeVisivel = tempoHoje >= tempoIni && tempoHoje <= tempoFim && tempoFim > tempoIni;
  const xHoje = hojeVisivel
    ? margin.left + plotW * ((tempoHoje - tempoIni) / (tempoFim - tempoIni))
    : null;

  const diaHover = hoverIdx !== null ? dias[hoverIdx] : null;

  // Handlers do mouse com grace period para rolagem suave no tooltip
  const handleSvgMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const idx = Math.max(
      0,
      Math.min(dias.length - 1, Math.round((relX / rect.width) * (dias.length - 1)))
    );
    setHoverIdx(idx);
    setTooltipVisivel(true);
  };

  const handleSvgMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipVisivel(false);
      setHoverIdx(null);
    }, 300);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    setTooltipVisivel(false);
    setHoverIdx(null);
  };

  // Posição calculada do tooltip
  let tooltipLeftPx = 0;
  let tooltipTopPx = 0;
  if (diaHover && hoverIdx !== null) {
    const rawX = xCoord(hoverIdx);
    const valoresNoDia = [
      linhasAtivas.recebido ? (modo === 'acumulado' ? diaHover.accRecebido : diaHover.recebido) : 0,
      linhasAtivas.aReceber ? (modo === 'acumulado' ? diaHover.accAReceber : diaHover.aReceber) : 0,
      linhasAtivas.pago ? (modo === 'acumulado' ? diaHover.accPago : diaHover.pago) : 0,
      linhasAtivas.aPagar ? (modo === 'acumulado' ? diaHover.accAPagar : diaHover.aPagar) : 0,
    ];
    const maxNoDia = Math.max(...valoresNoDia);
    const rawY = yCoord(maxNoDia);

    tooltipLeftPx = Math.max(150, Math.min(width - 160, rawX));
    tooltipTopPx = Math.max(20, Math.min(height - 70, rawY));
  }

  const ultimoDia = dias[dias.length - 1];

  return (
    <div
      ref={containerRef}
      className={`chart-box line-chart-box ${expandido ? 'expanded' : ''}`}
      style={{ gridColumn: expandido ? '1 / -1' : undefined }}
    >
      {/* Cabeçalho do Gráfico */}
      <div className="chart-title-row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Evolução por Status
          </div>
          {onMudarAba && (
            <div className="chart-tabs-nav">
              <button
                className="chart-tab-btn"
                onClick={() => onMudarAba('evolucao')}
                title="Ver gráfico de Entradas, Saídas e Resultado Geral"
              >
                Geral
              </button>
              <button
                className="chart-tab-btn active"
                onClick={() => onMudarAba('status')}
                title="Ver detalhamento por Pago, À Pagar, Recebido e À Receber"
              >
                Por Status
              </button>
            </div>
          )}
        </div>

        <div className="chart-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* Seletor de Modo: Acumulado vs Diário */}
          <select
            className="chart-filter"
            value={modo}
            onChange={(e) => setModo(e.target.value as 'acumulado' | 'diario')}
          >
            <option value="acumulado">Acumulado</option>
            <option value="diario">Diário pontual</option>
          </select>

          {/* Botão de Expandir / Retomar */}
          <button
            className="btn small secondary"
            onClick={() => onToggleExpand(!expandido)}
            title={expandido ? 'Retomar visualização padrão' : 'Expandir gráfico na largura total'}
          >
            {expandido ? (
              <>
                <Minimize2 size={12} /> Retomar
              </>
            ) : (
              <>
                <Maximize2 size={12} /> Expandir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subtítulo informativo */}
      <div className="section-subtitle" style={{ margin: '4px 0 8px 0' }}>
        {modo === 'acumulado'
          ? 'Evolução acumulada por status (as linhas tracejadas demonstram a evolução dos gastos e receitas totais do mês)'
          : 'Valores diários pontuais por status de lançamento'}
      </div>

      {/* Barra de Controle de Séries: Chips com Flag Ativo/Desativado e Seleção em Lote */}
      <div className="series-controls-bar">
        <div className="series-toggles">
          {/* 1. RECEBIDO */}
          <button
            type="button"
            className={`series-pill ${linhasAtivas.recebido ? 'is-active' : 'is-inactive'}`}
            onClick={() => toggleLinha('recebido')}
            title={linhasAtivas.recebido ? 'Clique para ocultar a linha de Recebido' : 'Clique para exibir a linha de Recebido'}
          >
            <span
              className="series-swatch solid"
              style={{ backgroundColor: COR_RECEBIDO }}
            />
            <span>Recebido</span>
            <span className={`status-flag ${linhasAtivas.recebido ? 'active-verde' : 'inactive'}`}>
              <span className="flag-dot" />
              {linhasAtivas.recebido ? 'Ativo' : 'Desativado'}
            </span>
          </button>

          {/* 2. À RECEBER */}
          <button
            type="button"
            className={`series-pill ${linhasAtivas.aReceber ? 'is-active' : 'is-inactive'}`}
            onClick={() => toggleLinha('aReceber')}
            title={linhasAtivas.aReceber ? 'Clique para ocultar a linha de À Receber (Previsão)' : 'Clique para exibir a linha de À Receber (Previsão)'}
          >
            <span
              className="series-swatch dashed"
              style={{ borderColor: COR_A_RECEBER }}
            />
            <span>À Receber</span>
            <span className={`status-flag ${linhasAtivas.aReceber ? 'active-verde' : 'inactive'}`}>
              <span className="flag-dot" />
              {linhasAtivas.aReceber ? 'Ativo' : 'Desativado'}
            </span>
          </button>

          {/* 3. PAGO */}
          <button
            type="button"
            className={`series-pill ${linhasAtivas.pago ? 'is-active' : 'is-inactive'}`}
            onClick={() => toggleLinha('pago')}
            title={linhasAtivas.pago ? 'Clique para ocultar a linha de Pago' : 'Clique para exibir a linha de Pago'}
          >
            <span
              className="series-swatch solid"
              style={{ backgroundColor: COR_PAGO }}
            />
            <span>Pago</span>
            <span className={`status-flag ${linhasAtivas.pago ? 'active-laranja' : 'inactive'}`}>
              <span className="flag-dot" />
              {linhasAtivas.pago ? 'Ativo' : 'Desativado'}
            </span>
          </button>

          {/* 4. À PAGAR */}
          <button
            type="button"
            className={`series-pill ${linhasAtivas.aPagar ? 'is-active' : 'is-inactive'}`}
            onClick={() => toggleLinha('aPagar')}
            title={linhasAtivas.aPagar ? 'Clique para ocultar a linha de À Pagar (Previsão)' : 'Clique para exibir a linha de À Pagar (Previsão)'}
          >
            <span
              className="series-swatch dashed"
              style={{ borderColor: COR_A_PAGAR }}
            />
            <span>À Pagar</span>
            <span className={`status-flag ${linhasAtivas.aPagar ? 'active-laranja' : 'inactive'}`}>
              <span className="flag-dot" />
              {linhasAtivas.aPagar ? 'Ativo' : 'Desativado'}
            </span>
          </button>
        </div>

        {/* Ações em Lote: Selecionar Todos / Desmarcar Todos */}
        <div className="series-bulk-actions">
          <button
            type="button"
            onClick={selecionarTodos}
            className="btn-bulk"
            title="Exibir todas as 4 séries no gráfico"
          >
            <Check size={12} strokeWidth={2.5} /> Selecionar todos
          </button>
          <button
            type="button"
            onClick={desmarcarTodos}
            className="btn-bulk"
            title="Ocultar todas as séries do gráfico"
          >
            <X size={12} strokeWidth={2.5} /> Desmarcar todos
          </button>
        </div>
      </div>

      {/* Área do Gráfico SVG */}
      <div style={{ position: 'relative', width: '100%', height: height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Grade e Ticks do Eixo Y */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={yCoord(tick)}
                x2={width - margin.right}
                y2={yCoord(tick)}
                className={tick === 0 ? 'svg-zero' : 'svg-grid'}
              />
              <text
                x={margin.left - 12}
                y={yCoord(tick) + 4}
                className="svg-axis"
                textAnchor="end"
              >
                {moedaCurta(tick)}
              </text>
            </g>
          ))}

          {/* Rótulos do Eixo X (Datas) */}
          {dias.map((d, index) => {
            const passo = Math.ceil(dias.length / (expandido ? 16 : 8));
            if (index % passo === 0 || index === dias.length - 1) {
              return (
                <text
                  key={index}
                  x={xCoord(index)}
                  y={height - 16}
                  className="svg-axis"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              );
            }
            return null;
          })}

          {/* Linhas SVG conforme selecionadas */}
          {/* 1. Recebido: Verde contínuo firme (até a última data realizada) */}
          {linhasAtivas.recebido && (
            <path
              d={
                modo === 'acumulado'
                  ? caminhoLinha((d) => d.accRecebido, ultimoDiaRecebidoIdx)
                  : caminhoLinha((d) => d.recebido)
              }
              className="line-recebido"
              style={{ stroke: COR_RECEBIDO, strokeWidth: 1.5, fill: 'none' }}
            />
          )}

          {/* 2. À Receber: Verde tracejado suave (totalizando todas as entradas projetadas) */}
          {linhasAtivas.aReceber && (
            <path
              d={caminhoLinha((d) => (modo === 'acumulado' ? d.accAReceber : d.aReceber))}
              className="line-a-receber"
              style={{
                stroke: COR_A_RECEBER,
                strokeWidth: 1.0,
                strokeDasharray: '4 4',
                opacity: 0.72,
                fill: 'none',
              }}
            />
          )}

          {/* 3. Pago: Laranja suave contínuo firme (até a última data paga) */}
          {linhasAtivas.pago && (
            <path
              d={
                modo === 'acumulado'
                  ? caminhoLinha((d) => d.accPago, ultimoDiaPagoIdx)
                  : caminhoLinha((d) => d.pago)
              }
              className="line-pago"
              style={{ stroke: COR_PAGO, strokeWidth: 1.5, fill: 'none' }}
            />
          )}

          {/* 4. À Pagar: Laranja pastel suave tracejado (trajetória total dos compromissos de saídas) */}
          {linhasAtivas.aPagar && (
            <path
              d={caminhoLinha((d) => (modo === 'acumulado' ? d.accAPagar : d.aPagar))}
              className="line-a-pagar"
              style={{
                stroke: COR_A_PAGAR,
                strokeWidth: 1.0,
                strokeDasharray: '4 4',
                opacity: 0.72,
                fill: 'none',
              }}
            />
          )}

          {/* Pontos nos nós das linhas */}
          {dias.map((d, i) => (
            <g key={i}>
              {/* Recebido: somente até a última data com recebido */}
              {linhasAtivas.recebido && (modo !== 'acumulado' || i <= ultimoDiaRecebidoIdx) && (
                <circle
                  cx={xCoord(i)}
                  cy={yCoord(modo === 'acumulado' ? d.accRecebido : d.recebido)}
                  r={expandido ? 2.4 : 1.8}
                  fill={COR_RECEBIDO}
                />
              )}

              {/* À Receber */}
              {linhasAtivas.aReceber && (
                <circle
                  cx={xCoord(i)}
                  cy={yCoord(modo === 'acumulado' ? d.accAReceber : d.aReceber)}
                  r={expandido ? 2.2 : 1.6}
                  fill="var(--card)"
                  stroke={COR_A_RECEBER}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
              )}

              {/* Pago: somente até a última data com pagamento */}
              {linhasAtivas.pago && (modo !== 'acumulado' || i <= ultimoDiaPagoIdx) && (
                <circle
                  cx={xCoord(i)}
                  cy={yCoord(modo === 'acumulado' ? d.accPago : d.pago)}
                  r={expandido ? 2.4 : 1.8}
                  fill={COR_PAGO}
                />
              )}

              {/* À Pagar */}
              {linhasAtivas.aPagar && (
                <circle
                  cx={xCoord(i)}
                  cy={yCoord(modo === 'acumulado' ? d.accAPagar : d.aPagar)}
                  r={expandido ? 2.2 : 1.6}
                  fill="var(--card)"
                  stroke={COR_A_PAGAR}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
              )}
            </g>
          ))}

          {/* Rótulos de dados finais no formato "0.000,00" (ex: 19.532,24) */}
          {modo === 'acumulado' && (
            <>
              {/* Recebido: na ponta final da linha (última data com recebimento) */}
              {linhasAtivas.recebido &&
                ultimoDiaRecebidoIdx >= 0 &&
                dias[ultimoDiaRecebidoIdx]?.accRecebido > 0 && (
                  <text
                    x={xCoord(ultimoDiaRecebidoIdx) + 8}
                    y={yCoord(dias[ultimoDiaRecebidoIdx].accRecebido) + 5}
                    fill={COR_RECEBIDO}
                    className="data-label-line"
                  >
                    {formatarRotulo(dias[ultimoDiaRecebidoIdx].accRecebido)}
                  </text>
                )}

              {/* À Receber: no final do período com o total geral projetado de receitas */}
              {linhasAtivas.aReceber && ultimoDia && ultimoDia.accAReceber > 0 && (
                <text
                  x={xCoord(dias.length - 1) + 8}
                  y={yCoord(ultimoDia.accAReceber) + 5}
                  fill={COR_A_RECEBER}
                  className="data-label-line"
                >
                  {formatarRotulo(ultimoDia.accAReceber)}
                </text>
              )}

              {/* Pago: na ponta final da linha (última data com pagamento realizado) */}
              {linhasAtivas.pago &&
                ultimoDiaPagoIdx >= 0 &&
                dias[ultimoDiaPagoIdx]?.accPago > 0 && (
                  <text
                    x={xCoord(ultimoDiaPagoIdx) + 8}
                    y={yCoord(dias[ultimoDiaPagoIdx].accPago) + 5}
                    fill={COR_PAGO}
                    className="data-label-line"
                  >
                    {formatarRotulo(dias[ultimoDiaPagoIdx].accPago)}
                  </text>
                )}

              {/* À Pagar: no final do período com o total geral projetado de saídas (19.532,24) */}
              {linhasAtivas.aPagar && ultimoDia && ultimoDia.accAPagar > 0 && (
                <text
                  x={xCoord(dias.length - 1) + 8}
                  y={yCoord(ultimoDia.accAPagar) + 5}
                  fill={COR_A_PAGAR}
                  className="data-label-line"
                >
                  {formatarRotulo(ultimoDia.accAPagar)}
                </text>
              )}
            </>
          )}

          {/* Marcador de Hoje */}
          {xHoje !== null && (
            <g>
              <line
                x1={xHoje}
                y1={margin.top}
                x2={xHoje}
                y2={height - margin.bottom}
                className="today-line"
              />
              <text x={xHoje + 5} y={margin.top + 12} className="today-label">
                Hoje
              </text>
            </g>
          )}

          {/* Linha vertical de hover */}
          {hoverIdx !== null && (
            <line
              x1={xCoord(hoverIdx)}
              y1={margin.top}
              x2={xCoord(hoverIdx)}
              y2={height - margin.bottom}
              className="hover-line"
            />
          )}

          {/* Área invisível de captura de mouse */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={handleSvgMouseLeave}
          />
        </svg>

        {/* Mensagem informativa quando todas as linhas forem desmarcadas */}
        {nenhumaLinhaAtiva && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--muted)',
              background: 'var(--card)',
              padding: '14px 22px',
              borderRadius: 10,
              border: '1px dashed var(--border)',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Info size={22} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
              Nenhuma linha selecionada
            </span>
            <span style={{ fontSize: 12 }}>
              Clique em &ldquo;Selecionar todos&rdquo; ou nas legendas acima para exibir as séries no gráfico.
            </span>
          </div>
        )}

        {/* Tooltip com corpo rolável INTERATIVO e dados detalhados */}
        {diaHover && tooltipVisivel && hoverIdx !== null && !nenhumaLinhaAtiva && (
          <div
            className="cash-tooltip"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            style={{
              opacity: 1,
              pointerEvents: 'auto',
              left: `${tooltipLeftPx}px`,
              top: `${tooltipTopPx}px`,
            }}
          >
            <div className="tooltip-box">
              <div
                style={{
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 4,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {modo === 'acumulado' ? `Até ${formatarData(diaHover.data)}` : formatarData(diaHover.data)}
              </div>

              <div className="tooltip-scroll-body" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {/* 1. Recebido */}
                {linhasAtivas.recebido && (modo === 'acumulado' ? diaHover.accRecebido : diaHover.recebido) > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COR_RECEBIDO, fontWeight: 700 }}>
                      <span>Recebido {modo === 'acumulado' ? 'Acumulado' : ''}</span>
                      <span>{moeda(modo === 'acumulado' ? diaHover.accRecebido : diaHover.recebido)}</span>
                    </div>
                    {(modo === 'acumulado' ? diaHover.recebidoAcumLista : diaHover.recebidoItens).map((it, idx) => (
                      <div key={idx} className="tooltip-item entrada" style={{ fontSize: 11, padding: '2px 0' }}>
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. À Receber */}
                {linhasAtivas.aReceber && (modo === 'acumulado' ? diaHover.accAReceber : diaHover.aReceber) > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COR_A_RECEBER, fontWeight: 700 }}>
                      <span>À Receber (Total Previsto) {modo === 'acumulado' ? 'Acumulado' : ''}</span>
                      <span>{moeda(modo === 'acumulado' ? diaHover.accAReceber : diaHover.aReceber)}</span>
                    </div>
                    {(modo === 'acumulado' ? diaHover.totalEntradasAcumLista : diaHover.aReceberItens).map((it, idx) => (
                      <div key={idx} className="tooltip-item entrada" style={{ fontSize: 11, padding: '2px 0', opacity: 0.9 }}>
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Pago */}
                {linhasAtivas.pago && (modo === 'acumulado' ? diaHover.accPago : diaHover.pago) > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COR_PAGO, fontWeight: 700 }}>
                      <span>Pago {modo === 'acumulado' ? 'Acumulado' : ''}</span>
                      <span>{moeda(modo === 'acumulado' ? diaHover.accPago : diaHover.pago)}</span>
                    </div>
                    {(modo === 'acumulado' ? diaHover.pagoAcumLista : diaHover.pagoItens).map((it, idx) => (
                      <div key={idx} className="tooltip-item saida" style={{ fontSize: 11, padding: '2px 0' }}>
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. À Pagar */}
                {linhasAtivas.aPagar && (modo === 'acumulado' ? diaHover.accAPagar : diaHover.aPagar) > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COR_A_PAGAR, fontWeight: 700 }}>
                      <span>À Pagar (Total Previsto) {modo === 'acumulado' ? 'Acumulado' : ''}</span>
                      <span>{moeda(modo === 'acumulado' ? diaHover.accAPagar : diaHover.aPagar)}</span>
                    </div>
                    {(modo === 'acumulado' ? diaHover.totalSaidasAcumLista : diaHover.aPagarItens).map((it, idx) => (
                      <div key={idx} className="tooltip-item saida" style={{ fontSize: 11, padding: '2px 0', opacity: 0.9 }}>
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totalizadores no Rodapé do Tooltip */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--positive)', fontWeight: 600 }}>
                  <span>Total Entradas:</span>
                  <span>
                    {moeda(
                      modo === 'acumulado'
                        ? diaHover.accAReceber
                        : diaHover.recebido + diaHover.aReceber
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--negative)', fontWeight: 600 }}>
                  <span>Total Saídas:</span>
                  <span>
                    {moeda(
                      modo === 'acumulado'
                        ? diaHover.accAPagar
                        : diaHover.pago + diaHover.aPagar
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    borderTop: '1px dashed var(--border)',
                    paddingTop: 3,
                    marginTop: 2,
                    color:
                      (modo === 'acumulado'
                        ? diaHover.accAReceber - diaHover.accAPagar
                        : diaHover.recebido + diaHover.aReceber - (diaHover.pago + diaHover.aPagar)) >= 0
                        ? 'var(--positive)'
                        : 'var(--negative)',
                  }}
                >
                  <span>Saldo Projetado:</span>
                  <span>
                    {moeda(
                      modo === 'acumulado'
                        ? diaHover.accAReceber - diaHover.accAPagar
                        : diaHover.recebido + diaHover.aReceber - (diaHover.pago + diaHover.aPagar)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legenda Resumida no Rodapé */}
      <div className="legend" style={{ justifyContent: 'center', gap: 16 }}>
        <span
          onClick={() => toggleLinha('recebido')}
          style={{ cursor: 'pointer', opacity: linhasAtivas.recebido ? 1 : 0.4 }}
          title="Clique para alternar linha de Recebido"
        >
          <i style={{ background: COR_RECEBIDO, height: 3 }}></i>Recebido ({linhasAtivas.recebido ? 'Ativo' : 'Desativado'})
        </span>
        <span
          onClick={() => toggleLinha('aReceber')}
          style={{ cursor: 'pointer', opacity: linhasAtivas.aReceber ? 1 : 0.4 }}
          title="Clique para alternar linha de À Receber (Previsão)"
        >
          <i style={{ borderBottom: `2px dashed ${COR_A_RECEBER}`, background: 'transparent' }}></i>À Receber ({linhasAtivas.aReceber ? 'Ativo' : 'Desativado'})
        </span>
        <span
          onClick={() => toggleLinha('pago')}
          style={{ cursor: 'pointer', opacity: linhasAtivas.pago ? 1 : 0.4 }}
          title="Clique para alternar linha de Pago"
        >
          <i style={{ background: COR_PAGO, height: 3 }}></i>Pago ({linhasAtivas.pago ? 'Ativo' : 'Desativado'})
        </span>
        <span
          onClick={() => toggleLinha('aPagar')}
          style={{ cursor: 'pointer', opacity: linhasAtivas.aPagar ? 1 : 0.4 }}
          title="Clique para alternar linha de À Pagar (Previsão)"
        >
          <i style={{ borderBottom: `2px dashed ${COR_A_PAGAR}`, background: 'transparent' }}></i>À Pagar ({linhasAtivas.aPagar ? 'Ativo' : 'Desativado'})
        </span>
      </div>
    </div>
  );
}
