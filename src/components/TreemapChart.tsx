'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LancamentoItem } from './CashFlowChart';

interface TreemapChartProps {
  dados: LancamentoItem[];
  subcategoriaSelecionada: string;
  onSelecionarSubcategoria: (sub: string) => void;
  onLimparFiltro: () => void;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(texto: string): string {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function TreemapChart({
  dados,
  subcategoriaSelecionada,
  onSelecionarSubcategoria,
  onLimparFiltro,
}: TreemapChartProps) {
  const [tipo, setTipo] = useState<'ambos' | 'entradas' | 'saidas'>('ambos');
  const [temaAtual, setTemaAtual] = useState<'dark' | 'light'>('dark');
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const atualizarTema = () => {
      const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTemaAtual(t);
    };
    atualizarTema();
    const observer = new MutationObserver(atualizarTema);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Agrupamento por subcategoria
  const { mapa, chavesOrdenadas, totalEntradas, totalSaidas } = useMemo(() => {
    const m: Record<
      string,
      {
        nome: string;
        valor: number;
        cor: number;
        naturezaOrig: string;
      }
    > = {};

    let totEntradas = 0;
    let totSaidas = 0;

    dados.forEach((x) => {
      const nat = normalizar(x.natureza);
      if (tipo === 'entradas' && nat !== 'receita') return;
      if (tipo === 'saidas' && nat === 'receita') return;

      const nome = x.subcategoria || x.categoria || '(Sem subcategoria)';
      const valAbs = Math.abs(Number(x.valor) || 0);
      const sinal = nat === 'receita' ? 1 : -1;

      if (nat === 'receita') {
        totEntradas += valAbs;
      } else {
        totSaidas += valAbs;
      }

      if (!m[nome]) {
        m[nome] = {
          nome,
          valor: 0,
          cor: 0,
          naturezaOrig: x.natureza,
        };
      }

      m[nome].valor += valAbs;
      m[nome].cor += sinal * valAbs;
    });

    const ordenadas = Object.keys(m).sort((a, b) => m[b].valor - m[a].valor);
    return {
      mapa: m,
      chavesOrdenadas: ordenadas,
      totalEntradas: totEntradas,
      totalSaidas: totSaidas,
    };
  }, [dados, tipo]);

  const posicionarTooltip = () => {
    if (!tooltipRef.current || !wrapperRef.current) return;
    const contW = wrapperRef.current.clientWidth;
    const contH = wrapperRef.current.clientHeight;
    const toolW = tooltipRef.current.offsetWidth || 200;
    const toolH = tooltipRef.current.offsetHeight || 60;

    const limiteX = Math.max(0, contW - toolW - 20);
    const limiteY = Math.max(0, contH - toolH - 20);
    const x = Math.min(mousePosRef.current.x + 8, limiteX);
    const y = Math.min(mousePosRef.current.y + 8, limiteY);

    tooltipRef.current.style.left = `${Math.max(6, x)}px`;
    tooltipRef.current.style.top = `${Math.max(6, y)}px`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (tooltipRef.current && tooltipRef.current.style.opacity === '1') {
      posicionarTooltip();
    }
  };

  // Renderizar o Google Charts TreeMap
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function desenhar() {
      if (!window.google?.visualization?.TreeMap || !containerRef.current) return;
      if (chavesOrdenadas.length === 0) return;

      const dadosArray: any[] = [
        ['Subcategoria', 'Pai', 'Valor', 'Cor'],
        ['Total', null, 0, 0],
      ];

      chavesOrdenadas.forEach((nome) => {
        const item = mapa[nome];
        if (item.valor > 0) {
          dadosArray.push([
            nome,
            'Total',
            item.valor,
            tipo === 'entradas' ? item.valor : tipo === 'saidas' ? -item.valor : item.cor,
          ]);
        }
      });

      if (dadosArray.length <= 1) return;

      const dataTable = window.google.visualization.arrayToDataTable(dadosArray);
      const chart = new window.google.visualization.TreeMap(containerRef.current);

      const isDark = temaAtual === 'dark';

      chart.draw(dataTable, {
        minColor: isDark
          ? (tipo === 'entradas' ? '#064e3b' : '#78350f')
          : (tipo === 'entradas' ? '#dfffe9' : '#F9A825'),
        midColor: isDark
          ? (tipo === 'saidas' ? '#92400e' : tipo === 'entradas' ? '#047857' : '#1e353c')
          : (tipo === 'saidas' ? '#f7d47a' : tipo === 'entradas' ? '#9cf3b9' : '#f4f1df'),
        maxColor: isDark
          ? (tipo === 'saidas' ? '#d97706' : '#10b981')
          : (tipo === 'saidas' ? '#fff4cf' : '#00E676'),
        headerHeight: 22,
        fontColor: isDark ? '#f8fafc' : (tipo === 'entradas' ? '#006b35' : tipo === 'saidas' ? '#7a4b00' : '#263238'),
        fontSize: 11,
        showScale: false,
        showTooltips: false,
        maxDepth: 1,
        maxPostDepth: 0,
      });

      // Clique no quadrante para filtrar
      window.google.visualization.events.addListener(chart, 'select', () => {
        const sel = chart.getSelection();
        if (sel && sel.length > 0 && sel[0].row > 0) {
          const subcatSelecionada = dataTable.getValue(sel[0].row, 0);
          if (subcatSelecionada && subcatSelecionada !== 'Total') {
            onSelecionarSubcategoria(subcatSelecionada);
          }
        }
      });

      // Hover para exibir tooltip com título e valor
      window.google.visualization.events.addListener(chart, 'onmouseover', (event: any) => {
        if (event.row === null || event.row === undefined || event.row < 1) return;
        const nome = dataTable.getValue(event.row, 0);
        const valor = dataTable.getValue(event.row, 2);

        if (nome === 'Total' || valor <= 0) {
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
          return;
        }

        const itemInfo = mapa[nome];
        const ehReceita = itemInfo ? itemInfo.cor >= 0 : false;
        const corTexto = ehReceita ? 'var(--positive)' : 'var(--negative)';
        const baseTotal = ehReceita ? totalEntradas : totalSaidas;
        const perc = baseTotal > 0
          ? ((Number(valor) / baseTotal) * 100).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : '0,0';
        const rotuloBase = ehReceita ? 'das entradas' : 'das saídas';

        if (tooltipRef.current) {
          tooltipRef.current.innerHTML = `
            <div class="tooltip-box" style="padding: 10px 12px;">
              <div class="tooltip-date" style="font-weight: 700; margin-bottom: 3px; color: var(--text);">${escapeHtml(nome)}</div>
              <div style="font-size: 13px; font-weight: 700; color: ${corTexto};">${moeda(valor)}</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 3px; font-weight: 500;">${perc}% ${rotuloBase}</div>
            </div>
          `;
          posicionarTooltip();
          tooltipRef.current.style.opacity = '1';
        }
      });

      window.google.visualization.events.addListener(chart, 'onmouseout', () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      });
    }

    if (window.google?.charts) {
      window.google.charts.load('current', { packages: ['treemap'], language: 'pt-BR' });
      window.google.charts.setOnLoadCallback(desenhar);
    } else {
      const interval = setInterval(() => {
        if (window.google?.charts) {
          clearInterval(interval);
          window.google.charts.load('current', { packages: ['treemap'], language: 'pt-BR' });
          window.google.charts.setOnLoadCallback(desenhar);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [chavesOrdenadas, mapa, tipo, onSelecionarSubcategoria, temaAtual, totalEntradas, totalSaidas]);

  return (
    <div className="chart-box treemap-box">
      <div className="chart-title-row">
        <div className="section-title">Composição por subcategoria</div>
        <select
          className="chart-filter"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as any)}
        >
          <option value="ambos">Entradas e saídas</option>
          <option value="entradas">Entradas</option>
          <option value="saidas">Saídas</option>
        </select>
      </div>

      <div className="section-subtitle">
        Clique no quadrante para filtrar | Área proporcional
      </div>

      {/* Wrapper relativo com o tooltip separado do elemento de desenho do Google */}
      <div
        ref={wrapperRef}
        onMouseMove={handleMouseMove}
        style={{ position: 'relative', width: '100%', height: 315 }}
      >
        <div
          id="chartTreemap"
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
        {chavesOrdenadas.length === 0 && (
          <div className="empty" style={{ position: 'absolute', inset: 0 }}>
            Sem movimentos para exibir.
          </div>
        )}
        <div
          ref={tooltipRef}
          className="treemap-tooltip-instant"
          style={{ position: 'absolute', pointerEvents: 'none', zIndex: 100 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        {subcategoriaSelecionada && (
          <button
            className="btn small secondary"
            onClick={onLimparFiltro}
          >
            Limpar filtro de subcategoria
          </button>
        )}
      </div>
    </div>
  );
}
