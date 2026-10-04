'use client';

import React, { useMemo, useState } from 'react';
import { LancamentoItem } from './CashFlowChart';

interface AnnualViewProps {
  dados: LancamentoItem[];
  anos: number[];
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

function moedaCompacta(valor: number): string {
  const num = Number(valor) || 0;
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + 'K';
  }
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

const MESES_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function AnnualView({ dados, anos }: AnnualViewProps) {
  const [hoverMesPorAno, setHoverMesPorAno] = useState<Record<number, number | null>>({});

  const anosFiltrados = useMemo(() => {
    return anos.length > 0 ? anos.slice(0, 3) : [new Date().getFullYear()];
  }, [anos]);

  return (
    <div className="annual-view">
      {anosFiltrados.map((ano) => {
        // Montar dados dos 12 meses para o ano
        const meses = Array.from({ length: 12 }, (_, i) => ({
          mesNum: i + 1,
          label: MESES_LABEL[i],
          receitas: 0,
          custos: 0,
          consultoria: 0,
          recJipsya: 0,
          recLeandro: 0,
          accReceitas: 0,
          accCustos: 0,
          accConsultoria: 0,
          accJipsya: 0,
          accLeandro: 0,
        }));

        dados.forEach((x) => {
          const anoReg = x.ano || Number((x.dataLcto || x.competencia || '').slice(0, 4));
          if (anoReg !== ano) return;

          const mesReg = x.mesNum || Number((x.dataLcto || x.competencia || '').slice(5, 7));
          if (mesReg < 1 || mesReg > 12) return;

          const m = meses[mesReg - 1];
          const valAbs = Math.abs(Number(x.valor) || 0);
          const nat = x.natureza.toLowerCase();
          const texto = `${x.grupo} ${x.categoria} ${x.subcategoria} ${x.responsavel}`.toLowerCase();

          if (nat === 'receita') {
            m.receitas += valAbs;
            if (texto.includes('consult')) m.consultoria += valAbs;
            if (texto.includes('jipsya')) m.recJipsya += valAbs;
            if (texto.includes('leandro')) m.recLeandro += valAbs;
          } else {
            m.custos += valAbs;
          }
        });

        let accR = 0;
        let accC = 0;
        let accCons = 0;
        let accJip = 0;
        let accLea = 0;

        meses.forEach((m) => {
          accR += m.receitas;
          accC += m.custos;
          accCons += m.consultoria;
          accJip += m.recJipsya;
          accLea += m.recLeandro;

          m.accReceitas = accR;
          m.accCustos = accC;
          m.accConsultoria = accCons;
          m.accJipsya = accJip;
          m.accLeandro = accLea;
        });

        const mesesComMovimento = Math.max(
          1,
          meses.filter((m) => m.receitas || m.custos).length
        );
        const totalReceitas = meses[11].accReceitas;
        const totalCustos = meses[11].accCustos;

        const width = 450;
        const height = 305;
        const margin = { top: 18, right: 65, bottom: 48, left: 55 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        const maxVal = Math.max(
          100,
          ...meses.flatMap((m) => [
            m.receitas,
            m.custos,
            m.accReceitas,
            m.accCustos,
            m.accConsultoria,
            m.accJipsya,
            m.accLeandro,
          ])
        );

        const yCoord = (val: number) =>
          margin.top + ((maxVal - val) / maxVal) * plotH;
        const xMes = (idx: number) =>
          margin.left + (plotW * idx) / 11;

        const grupoW = plotW / 12;
        const barW = Math.max(4, grupoW * 0.28);
        const base = height - margin.bottom;

        const mesHoverIdx = hoverMesPorAno[ano] ?? null;
        const mesHover = mesHoverIdx !== null ? meses[mesHoverIdx] : null;

        const series = [
          { chave: 'accReceitas' as const, cor: 'var(--positive)', dashed: false },
          { chave: 'accCustos' as const, cor: 'var(--negative)', dashed: false },
          { chave: 'accConsultoria' as const, cor: 'var(--line-consultoria)', dashed: true },
          { chave: 'accJipsya' as const, cor: '#f43f5e', dashed: true },
          { chave: 'accLeandro' as const, cor: '#38bdf8', dashed: true },
        ];

        return (
          <div key={ano} className="chart-box annual-chart-box">
            <div className="annual-chart-header">
              <div>
                <div className="section-title">{ano}</div>
                <div className="section-subtitle">
                  Receitas, custos e acumulados
                </div>
              </div>
            </div>

            <div className="annual-cards">
              <div className="annual-card receita">
                Receita Média Mês
                <strong>{moedaCompacta(totalReceitas / mesesComMovimento)}</strong>
              </div>
              <div className="annual-card custo">
                Custo Médio Mês
                <strong>{moedaCompacta(totalCustos / mesesComMovimento)}</strong>
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', height }}>
              <svg
                viewBox={`0 0 ${width} ${height}`}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Linhas de grade */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const val = maxVal * pct;
                  return (
                    <g key={pct}>
                      <line
                        x1={margin.left}
                        y1={yCoord(val)}
                        x2={width - margin.right}
                        y2={yCoord(val)}
                        className={pct === 0 ? 'svg-zero' : 'svg-grid'}
                      />
                      <text
                        x={margin.left - 8}
                        y={yCoord(val) + 4}
                        className="svg-axis"
                        textAnchor="end"
                      >
                        {moedaCurta(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Barras mensais */}
                {meses.map((m, idx) => {
                  const centro = xMes(idx);
                  return (
                    <g key={idx}>
                      <rect
                        x={centro - barW - 1}
                        y={yCoord(m.receitas)}
                        width={barW}
                        height={Math.max(1, base - yCoord(m.receitas))}
                        fill="var(--positive)"
                        opacity={0.4}
                        rx={2}
                      />
                      <rect
                        x={centro + 1}
                        y={yCoord(m.custos)}
                        width={barW}
                        height={Math.max(1, base - yCoord(m.custos))}
                        fill="var(--negative)"
                        opacity={0.4}
                        rx={2}
                      />
                      <text
                        x={centro}
                        y={height - 20}
                        className="svg-axis"
                        textAnchor="middle"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}

                {/* Linhas acumuladas */}
                {series.map((s) => {
                  const dPath = meses
                    .map((m, i) => `${i === 0 ? 'M' : 'L'} ${xMes(i)} ${yCoord(m[s.chave])}`)
                    .join(' ');
                  const ultimoValor = meses[11][s.chave];

                  return (
                    <g key={s.chave}>
                      <path
                        d={dPath}
                        fill="none"
                        stroke={s.cor}
                        strokeWidth="1.8"
                        strokeDasharray={s.dashed ? '3 3' : undefined}
                      />
                      <text
                        x={xMes(11) + 6}
                        y={yCoord(ultimoValor) + 4}
                        fill={s.cor}
                        fontSize="10"
                        fontWeight="700"
                      >
                        {moedaCompacta(ultimoValor)}
                      </text>
                    </g>
                  );
                })}

                {/* Área hover receptora */}
                {meses.map((m, idx) => (
                  <rect
                    key={idx}
                    x={xMes(idx) - grupoW / 2}
                    y={margin.top}
                    width={grupoW}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() =>
                      setHoverMesPorAno((prev) => ({ ...prev, [ano]: idx }))
                    }
                    onMouseLeave={() =>
                      setHoverMesPorAno((prev) => ({ ...prev, [ano]: null }))
                    }
                  />
                ))}
              </svg>

              {/* Tooltip anual */}
              {mesHover && (
                <div
                  className="annual-tooltip"
                  style={{ opacity: 1, top: 20, right: 10 }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {mesHover.label.toUpperCase()} / {ano}
                  </div>
                  <div className="tooltip-item" style={{ color: 'var(--positive)' }}>
                    <span>Receitas:</span> <strong>{moeda(mesHover.receitas)}</strong>
                  </div>
                  <div className="tooltip-item" style={{ color: 'var(--negative)' }}>
                    <span>Custos:</span> <strong>{moeda(mesHover.custos)}</strong>
                  </div>
                  <div className="tooltip-item" style={{ color: 'var(--positive)' }}>
                    <span>Acc. Receitas:</span>{' '}
                    <strong>{moeda(mesHover.accReceitas)}</strong>
                  </div>
                  <div className="tooltip-item" style={{ color: 'var(--negative)' }}>
                    <span>Acc. Custos:</span>{' '}
                    <strong>{moeda(mesHover.accCustos)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="legend">
              <span>
                <i style={{ background: 'var(--positive)', opacity: 0.7 }}></i>Receitas
              </span>
              <span>
                <i style={{ background: 'var(--negative)', opacity: 0.7 }}></i>Custos
              </span>
              <span>
                <i style={{ background: 'var(--positive)' }}></i>Acc. Rec.
              </span>
              <span>
                <i style={{ background: 'var(--negative)' }}></i>Acc. Cust.
              </span>
              <span>
                <i style={{ background: 'var(--line-consultoria)' }}></i>Acc. Consult.
              </span>
              <span>
                <i style={{ background: '#f43f5e' }}></i>Acc. Jipsya
              </span>
              <span>
                <i style={{ background: '#38bdf8' }}></i>Acc. Leandro
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
