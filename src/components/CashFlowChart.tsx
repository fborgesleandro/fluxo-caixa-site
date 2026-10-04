'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface LancamentoItem {
  id: string;
  dataLcto: string;
  competencia: string;
  ano?: number;
  mesNum?: number;
  mes?: string;
  natureza: string;
  grupo: string;
  categoria: string;
  subcategoria: string;
  responsavel: string;
  valor: number;
  status: string;
  observacao?: string | null;
}

interface CashFlowChartProps {
  dados: LancamentoItem[];
  expandido: boolean;
  onToggleExpand: (novoEstado: boolean) => void;
  abaAtiva?: 'evolucao' | 'status';
  onMudarAba?: (aba: 'evolucao' | 'status') => void;
}

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

export default function CashFlowChart({
  dados,
  expandido,
  onToggleExpand,
  abaAtiva = 'evolucao',
  onMudarAba,
}: CashFlowChartProps) {
  const [modo, setModo] = useState<'acumulado' | 'diario'>('acumulado');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipVisivel, setTooltipVisivel] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Observar largura real do container para responsividade perfeita
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

  // Agrupar dados por dia
  const dias = useMemo(() => {
    const porDia: Record<
      string,
      {
        data: string;
        label: string;
        ano: string;
        entradas: { nome: string; valor: number }[];
        saidas: { nome: string; valor: number }[];
        totalEntradas: number;
        totalSaidas: number;
        accEntradas: number;
        accSaidas: number;
        accResultado: number;
        resultadoDia: number;
        entradasAcumuladasLista: { nome: string; valor: number }[];
        saidasAcumuladasLista: { nome: string; valor: number }[];
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
          entradas: [],
          saidas: [],
          totalEntradas: 0,
          totalSaidas: 0,
          accEntradas: 0,
          accSaidas: 0,
          accResultado: 0,
          resultadoDia: 0,
          entradasAcumuladasLista: [],
          saidasAcumuladasLista: [],
        };
      }

      const nat = normalizar(x.natureza);
      const valAbs = Math.abs(Number(x.valor) || 0);
      const nome = x.subcategoria || x.categoria || 'Geral';

      if (nat === 'receita') {
        porDia[chave].entradas.push({ nome, valor: valAbs });
        porDia[chave].totalEntradas += valAbs;
      } else {
        porDia[chave].saidas.push({ nome, valor: valAbs });
        porDia[chave].totalSaidas += valAbs;
      }
    });

    const chaves = Object.keys(porDia).sort();
    let accE = 0;
    let accS = 0;
    const mapaItensE: Record<string, number> = {};
    const mapaItensS: Record<string, number> = {};

    return chaves.map((k) => {
      const item = porDia[k];
      accE += item.totalEntradas;
      accS += item.totalSaidas;

      item.entradas.forEach((e) => {
        mapaItensE[e.nome] = (mapaItensE[e.nome] || 0) + e.valor;
      });
      item.saidas.forEach((s) => {
        mapaItensS[s.nome] = (mapaItensS[s.nome] || 0) + s.valor;
      });

      item.accEntradas = accE;
      item.accSaidas = accS;
      item.accResultado = accE - accS;
      item.resultadoDia = item.totalEntradas - item.totalSaidas;

      item.entradasAcumuladasLista = Object.keys(mapaItensE)
        .map((nome) => ({ nome, valor: mapaItensE[nome] }))
        .sort((a, b) => b.valor - a.valor);

      item.saidasAcumuladasLista = Object.keys(mapaItensS)
        .map((nome) => ({ nome, valor: mapaItensS[nome] }))
        .sort((a, b) => b.valor - a.valor);

      return item;
    });
  }, [dados]);

  if (dias.length === 0) {
    return (
      <div className={`chart-box line-chart-box ${expandido ? 'expanded' : ''}`}>
        <div className="section-title">Evolução do período</div>
        <div className="empty">Sem lançamentos com Data LCTO para exibir.</div>
      </div>
    );
  }

  const width = containerWidth;
  const height = expandido ? 520 : 315;
  const margin = {
    top: 22,
    right: modo === 'acumulado' ? 140 : 30,
    bottom: 45,
    left: 70,
  };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const valores: number[] = [];
  dias.forEach((d) => {
    if (modo === 'acumulado') {
      valores.push(d.accEntradas, d.accSaidas, d.accResultado);
    } else {
      valores.push(d.totalEntradas, d.totalSaidas, d.resultadoDia);
    }
  });

  const minVal = Math.min(0, Math.min(...valores));
  const maxVal = Math.max(0, Math.max(...valores));
  const pad = Math.max((maxVal - minVal) * 0.12, 100);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;

  const xCoord = (index: number) =>
    margin.left + (plotW * index) / Math.max(1, dias.length - 1);
  const yCoord = (valor: number) =>
    margin.top + ((yMax - valor) / (yMax - yMin)) * plotH;

  const ticks = gerarTicks(yMin, yMax, 5);

  const caminhoLinha = (valorFn: (d: (typeof dias)[0]) => number) => {
    return dias
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCoord(i)} ${yCoord(valorFn(d))}`)
      .join(' ');
  };

  // Linha de hoje
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

  // Gerenciamento de hover com grace period para rolagem interativa
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

  // Posição calculada do tooltip para garantir que caiba dentro do gráfico
  let tooltipLeftPx = 0;
  let tooltipTopPx = 0;
  if (diaHover && hoverIdx !== null) {
    const rawX = xCoord(hoverIdx);
    const rawY = yCoord(modo === 'acumulado' ? diaHover.accResultado : diaHover.resultadoDia);

    tooltipLeftPx = Math.max(140, Math.min(width - 160, rawX));
    tooltipTopPx = Math.max(20, Math.min(height - 70, rawY));
  }

  return (
    <div
      ref={containerRef}
      className={`chart-box line-chart-box ${expandido ? 'expanded' : ''}`}
      style={{ gridColumn: expandido ? '1 / -1' : undefined }}
    >
      <div className="chart-title-row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Evolução do período
          </div>
          {onMudarAba && (
            <div className="chart-tabs-nav">
              <button
                className="chart-tab-btn active"
                onClick={() => onMudarAba('evolucao')}
                title="Ver gráfico de Entradas, Saídas e Resultado Geral"
              >
                Geral
              </button>
              <button
                className="chart-tab-btn"
                onClick={() => onMudarAba('status')}
                title="Ver detalhamento por Pago, À Pagar, Recebido e À Receber"
              >
                Por Status
              </button>
            </div>
          )}
        </div>
        <div className="chart-actions">
          <select
            className="chart-filter"
            value={modo}
            onChange={(e) => setModo(e.target.value as 'acumulado' | 'diario')}
          >
            <option value="acumulado">Acumulado</option>
            <option value="diario">Diário pontual</option>
          </select>

          <button
            className="btn small secondary"
            onClick={() => onToggleExpand(!expandido)}
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

      <div className="section-subtitle">
        {modo === 'acumulado'
          ? 'Valores acumulados ao longo do período selecionado'
          : 'Valores diários pontuais por Data LCTO'}
      </div>

      <div style={{ position: 'relative', width: '100%', height: height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Linhas de grade e ticks do eixo Y */}
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
                x={margin.left - 10}
                y={yCoord(tick) + 4}
                className="svg-axis"
                textAnchor="end"
              >
                {moedaCurta(tick)}
              </text>
            </g>
          ))}

          {/* Rótulos de datas no eixo X */}
          {dias.map((d, index) => {
            const passo = Math.ceil(dias.length / (expandido ? 16 : 8));
            if (index % passo === 0 || index === dias.length - 1) {
              return (
                <text
                  key={index}
                  x={xCoord(index)}
                  y={height - 18}
                  className="svg-axis"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              );
            }
            return null;
          })}

          {/* Barras de resultado do dia no modo diário */}
          {modo === 'diario' &&
            dias.map((d, i) => {
              const res = d.resultadoDia;
              if (!res) return null;
              const yVal = yCoord(res);
              const yZero = yCoord(0);
              const barH = Math.max(1, Math.abs(yZero - yVal));
              const topY = Math.min(yZero, yVal);
              return (
                <rect
                  key={i}
                  x={xCoord(i) - (expandido ? 5 : 4)}
                  y={topY}
                  width={expandido ? 10 : 8}
                  height={barH}
                  rx={2}
                  className={res >= 0 ? 'bar-resultado-pos' : 'bar-resultado-neg'}
                />
              );
            })}

          {/* Séries de linhas */}
          <path
            d={caminhoLinha((d) => (modo === 'acumulado' ? d.accEntradas : d.totalEntradas))}
            className="line-entrada"
          />
          <path
            d={caminhoLinha((d) => (modo === 'acumulado' ? d.accSaidas : d.totalSaidas))}
            className="line-saida"
          />

          {modo === 'acumulado' && (
            <path
              d={caminhoLinha((d) => d.accResultado)}
              className="line-resultado"
            />
          )}

          {/* Pontos nas linhas */}
          {dias.map((d, i) => (
            <g key={i}>
              <circle
                cx={xCoord(i)}
                cy={yCoord(modo === 'acumulado' ? d.accEntradas : d.totalEntradas)}
                r={expandido ? 3.5 : 3}
                className="dot-entrada"
              />
              <circle
                cx={xCoord(i)}
                cy={yCoord(modo === 'acumulado' ? d.accSaidas : d.totalSaidas)}
                r={expandido ? 3.5 : 3}
                className="dot-saida"
              />
              {modo === 'acumulado' && (
                <circle
                  cx={xCoord(i)}
                  cy={yCoord(d.accResultado)}
                  r={expandido ? 3.8 : 3.2}
                  className="dot-resultado"
                />
              )}
            </g>
          ))}

          {/* Rótulos finais no modo acumulado */}
          {modo === 'acumulado' && dias.length > 0 && (
            <>
              <text
                x={xCoord(dias.length - 1) + 8}
                y={yCoord(dias[dias.length - 1].accEntradas) + 4}
                fill="#00E676"
                className="data-label-line"
              >
                {moedaCurta(dias[dias.length - 1].accEntradas)}
              </text>
              <text
                x={xCoord(dias.length - 1) + 8}
                y={yCoord(dias[dias.length - 1].accSaidas) + 4}
                fill="#F9A825"
                className="data-label-line"
              >
                {moedaCurta(dias[dias.length - 1].accSaidas)}
              </text>
              <text
                x={xCoord(dias.length - 1) + 8}
                y={yCoord(dias[dias.length - 1].accResultado) + 4}
                fill="var(--line-resultado)"
                className="data-label-line"
              >
                {moedaCurta(dias[dias.length - 1].accResultado)}
              </text>
            </>
          )}

          {/* Marcador de hoje */}
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

          {/* Linha de hover do mouse */}
          {hoverIdx !== null && (
            <line
              x1={xCoord(hoverIdx)}
              y1={margin.top}
              x2={xCoord(hoverIdx)}
              y2={height - margin.bottom}
              className="hover-line"
            />
          )}

          {/* Área invisível receptora de mouse */}
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

        {/* Tooltip com corpo rolável INTERATIVO (sem travar scroll) */}
        {diaHover && tooltipVisivel && hoverIdx !== null && (
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

              <div className="tooltip-scroll-body" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {diaHover.entradas.length > 0 && (
                  <div>
                    <div className="tooltip-item entrada" style={{ fontWeight: 700 }}>
                      Entradas {modo === 'acumulado' ? 'Acumuladas' : ''}
                    </div>
                    {(modo === 'acumulado' ? diaHover.entradasAcumuladasLista : diaHover.entradas).map((it, idx) => (
                      <div key={idx} className="tooltip-item entrada">
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {diaHover.saidas.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div className="tooltip-item saida" style={{ fontWeight: 700 }}>
                      Saídas {modo === 'acumulado' ? 'Acumuladas' : ''}
                    </div>
                    {(modo === 'acumulado' ? diaHover.saidasAcumuladasLista : diaHover.saidas).map((it, idx) => (
                      <div key={idx} className="tooltip-item saida">
                        <span>{it.nome}</span>
                        <span>{moeda(it.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                {modo === 'acumulado' ? (
                  <div
                    style={{
                      color: diaHover.accResultado >= 0 ? 'var(--positive)' : 'var(--negative)',
                      fontWeight: 700,
                    }}
                  >
                    Resultado Acumulado: {moeda(diaHover.accResultado)}
                  </div>
                ) : (
                  <div
                    style={{
                      color: diaHover.resultadoDia >= 0 ? 'var(--positive)' : 'var(--negative)',
                      fontWeight: 700,
                    }}
                  >
                    Resultado do Dia: {moeda(diaHover.resultadoDia)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--positive)' }}></i>Entradas
        </span>
        <span>
          <i style={{ background: 'var(--negative)' }}></i>Saídas
        </span>
        <span>
          <i style={{ background: 'var(--line-resultado)' }}></i>
          {modo === 'acumulado' ? 'Resultado Acumulado' : 'Resultado do Dia'}
        </span>
      </div>
    </div>
  );
}
