'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, X, UploadCloud } from 'lucide-react';

export interface InvestimentoItem {
  id: string;
  banco: string;
  tipo: string;
  valor: number;
  dataAtualizacao: string;
}

interface InvestmentsViewProps {
  investimentos: InvestimentoItem[];
  onNovo: () => void;
  onImportar: () => void;
  onSalvar: (invest: Partial<InvestimentoItem>) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarData(dataStr: string): string {
  if (!dataStr) return '';
  const partes = String(dataStr).split('-');
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

export default function InvestmentsView({
  investimentos,
  onNovo,
  onImportar,
  onSalvar,
  onExcluir,
}: InvestmentsViewProps) {
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<Partial<InvestimentoItem>>({});
  const [temaAtual, setTemaAtual] = useState<'dark' | 'light'>('dark');

  const wrapperTreemapRef = useRef<HTMLDivElement>(null);
  const containerTreemapRef = useRef<HTMLDivElement>(null);
  const tooltipInvestRef = useRef<HTMLDivElement>(null);
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

  // Posições mais recentes de cada ativo
  const { itensAtuais, subtotalGeral, ultimaData } = useMemo(() => {
    const mapa: Record<string, InvestimentoItem> = {};
    let maisRecente = '';

    investimentos.forEach((inv) => {
      const chave = `${inv.banco.toUpperCase()}_${inv.tipo.toLowerCase()}`;
      if (!mapa[chave] || inv.dataAtualizacao > mapa[chave].dataAtualizacao) {
        mapa[chave] = inv;
      }
      if (inv.dataAtualizacao > maisRecente) {
        maisRecente = inv.dataAtualizacao;
      }
    });

    const lista = Object.values(mapa).sort((a, b) => b.valor - a.valor);
    const subtotal = lista.reduce((acc, curr) => acc + curr.valor, 0);

    return {
      itensAtuais: lista,
      subtotalGeral: subtotal,
      ultimaData: maisRecente,
    };
  }, [investimentos]);

  const iniciarEdicao = (item: InvestimentoItem) => {
    setLinhaEmEdicao(item.id);
    setFormEdicao({ ...item });
  };

  const cancelarEdicao = () => {
    setLinhaEmEdicao(null);
    setFormEdicao({});
  };

  const salvarEdicao = async () => {
    if (!formEdicao.id || !formEdicao.banco || !formEdicao.tipo) return;
    await onSalvar(formEdicao);
    cancelarEdicao();
  };

  const posicionarTooltip = () => {
    if (!tooltipInvestRef.current || !wrapperTreemapRef.current) return;
    const contW = wrapperTreemapRef.current.clientWidth;
    const contH = wrapperTreemapRef.current.clientHeight;
    const toolW = tooltipInvestRef.current.offsetWidth || 210;
    const toolH = tooltipInvestRef.current.offsetHeight || 60;

    const limiteX = Math.max(0, contW - toolW - 20);
    const limiteY = Math.max(0, contH - toolH - 20);
    const x = Math.min(mousePosRef.current.x + 8, limiteX);
    const y = Math.min(mousePosRef.current.y + 8, limiteY);

    tooltipInvestRef.current.style.left = `${Math.max(6, x)}px`;
    tooltipInvestRef.current.style.top = `${Math.max(6, y)}px`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperTreemapRef.current) return;
    const rect = wrapperTreemapRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (tooltipInvestRef.current && tooltipInvestRef.current.style.opacity === '1') {
      posicionarTooltip();
    }
  };

  // Google Charts TreeMap de Investimentos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function desenharTreemapInvest() {
      if (!window.google?.visualization?.TreeMap || !containerTreemapRef.current) return;
      if (itensAtuais.length === 0 || !subtotalGeral) return;

      const dados: any[] = [
        ['Item', 'Pai', 'Valor', 'Cor'],
        ['Carteira', null, 0, 0],
      ];

      const mapaInst: Record<string, boolean> = {};
      itensAtuais.forEach((x) => {
        const b = (x.banco || 'Outros').toUpperCase();
        mapaInst[b] = true;
      });

      const instituicoes = Object.keys(mapaInst);
      instituicoes.forEach((inst) => {
        let corInst = 50;
        const norm = normalizar(inst);
        if (norm.includes('nubank')) corInst = 10;
        else if (norm.includes('swile')) corInst = 50;
        else if (norm.includes('picpay')) corInst = 90;
        else if (norm.includes('xp')) corInst = 30;

        dados.push([inst, 'Carteira', 0, corInst]);
      });

      itensAtuais.forEach((item) => {
        const banco = (item.banco || 'Outros').toUpperCase();
        const nome = `${item.tipo || 'Ativo'} (${banco})`;
        let corVal = 50;
        const norm = normalizar(banco);
        if (norm.includes('nubank')) corVal = 10;
        else if (norm.includes('swile')) corVal = 50;
        else if (norm.includes('picpay')) corVal = 90;
        else if (norm.includes('xp')) corVal = 30;

        dados.push([nome, banco, Number(item.valor) || 0, corVal]);
      });

      const dt = window.google.visualization.arrayToDataTable(dados);
      const chart = new window.google.visualization.TreeMap(containerTreemapRef.current);

      chart.draw(dt, {
        minColor: '#6f2dbd',
        midColor: '#757575',
        maxColor: '#00B050',
        headerHeight: 22,
        fontColor: '#ffffff',
        fontSize: 11,
        showScale: false,
        showTooltips: false,
        maxDepth: 2,
        maxPostDepth: 1,
      });

      window.google.visualization.events.addListener(chart, 'select', () => {
        chart.setSelection([]);
        chart.goUpAndDraw();
      });

      window.google.visualization.events.addListener(chart, 'onmouseover', (event: any) => {
        if (event.row === null || event.row === undefined) return;
        const nome = dt.getValue(event.row, 0);
        const valor = dt.getValue(event.row, 2);
        if (nome === 'Carteira' || valor <= 0) {
          if (tooltipInvestRef.current) tooltipInvestRef.current.style.opacity = '0';
          return;
        }

        const perc = subtotalGeral > 0 ? ((valor / subtotalGeral) * 100).toFixed(1) : '0.0';

        if (tooltipInvestRef.current) {
          tooltipInvestRef.current.innerHTML = `
            <div class="tooltip-box" style="padding: 10px 12px;">
              <div class="tooltip-date" style="font-weight: 700; margin-bottom: 3px; color: var(--text);">${escapeHtml(nome)}</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--line-resultado);">${moeda(valor)}</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${perc}% da carteira</div>
            </div>
          `;
          posicionarTooltip();
          tooltipInvestRef.current.style.opacity = '1';
        }
      });

      window.google.visualization.events.addListener(chart, 'onmouseout', () => {
        if (tooltipInvestRef.current) tooltipInvestRef.current.style.opacity = '0';
      });
    }

    if (window.google?.charts) {
      window.google.charts.load('current', { packages: ['treemap'], language: 'pt-BR' });
      window.google.charts.setOnLoadCallback(desenharTreemapInvest);
    } else {
      const interval = setInterval(() => {
        if (window.google?.charts) {
          clearInterval(interval);
          window.google.charts.load('current', { packages: ['treemap'], language: 'pt-BR' });
          window.google.charts.setOnLoadCallback(desenharTreemapInvest);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [itensAtuais, subtotalGeral, temaAtual]);

  return (
    <div className="investment-view">
      <div className="chart-box" style={{ minHeight: 'auto' }}>
        <div className="invest-dashboard-grid">
          {/* Lado Esquerdo: Lista de Ativos */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="invest-card-small">
              <div>
                <div className="section-title" style={{ marginBottom: 2 }}>
                  Posição Atual de Investimentos
                </div>
                <div className="section-subtitle" style={{ marginBottom: 0 }}>
                  {ultimaData
                    ? `Última atualização: ${formatarData(ultimaData)}`
                    : `${itensAtuais.length} tipos ativos`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Total Investido
                </span>
                <div className="invest-subtotal-val">{moeda(subtotalGeral)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
              <button
                className="btn small header-btn"
                onClick={onImportar}
                title="Importar dados reais da aba Investimentos do Google Sheets"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                <UploadCloud size={14} /> Importar Planilha
              </button>
              <button className="btn small secondary" onClick={onNovo}>
                <Plus size={14} /> Nova atualização
              </button>
            </div>

            <div className="upcoming-list" style={{ flex: 1, maxHeight: 380 }}>
              {itensAtuais.length === 0 ? (
                <div className="empty">Nenhum investimento registrado.</div>
              ) : (
                itensAtuais.map((item) => {
                  if (linhaEmEdicao === item.id) {
                    return (
                      <div key={item.id} className="invest-item-row editing">
                        <input
                          className="invest-edit-input"
                          value={formEdicao.banco || ''}
                          onChange={(e) =>
                            setFormEdicao({ ...formEdicao, banco: e.target.value })
                          }
                          placeholder="Banco"
                        />
                        <input
                          className="invest-edit-input"
                          value={formEdicao.tipo || ''}
                          onChange={(e) =>
                            setFormEdicao({ ...formEdicao, tipo: e.target.value })
                          }
                          placeholder="Tipo"
                        />
                        <input
                          className="invest-edit-input"
                          type="number"
                          step="0.01"
                          value={formEdicao.valor || ''}
                          onChange={(e) =>
                            setFormEdicao({
                              ...formEdicao,
                              valor: Number(e.target.value),
                            })
                          }
                          placeholder="Valor"
                        />
                        <input
                          className="invest-edit-input"
                          type="date"
                          value={formEdicao.dataAtualizacao || ''}
                          onChange={(e) =>
                            setFormEdicao({
                              ...formEdicao,
                              dataAtualizacao: e.target.value,
                            })
                          }
                        />
                        <div className="invest-inline-actions">
                          <button className="btn small success" onClick={salvarEdicao}>
                            <Check size={12} />
                          </button>
                          <button
                            className="btn small secondary"
                            onClick={cancelarEdicao}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="invest-item-row">
                      <div className="invest-item-info">
                        <strong>{item.tipo || 'Investimento'}</strong>
                        <span>
                          {item.banco || ''} | Atualizado: {formatarData(item.dataAtualizacao)}
                        </span>
                      </div>
                      <div className="invest-item-val">{moeda(item.valor)}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn small secondary"
                          onClick={() => iniciarEdicao(item)}
                          title="Editar investimento"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn small danger"
                          onClick={() => {
                            if (confirm(`Excluir ${item.tipo} (${item.banco})?`)) {
                              onExcluir(item.id);
                            }
                          }}
                          title="Excluir investimento"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lado Direito: Treemap da Carteira por Instituição com Tooltip Instantâneo */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Composição da Carteira
            </div>
            <div className="section-subtitle">
              Distribuição por Instituição Financeira
            </div>

            <div
              ref={wrapperTreemapRef}
              onMouseMove={handleMouseMove}
              style={{
                position: 'relative',
                width: '100%',
                height: 420,
                marginTop: 6,
              }}
            >
              <div
                id="chartTreemapInvest"
                ref={containerTreemapRef}
                style={{ width: '100%', height: '100%' }}
              />
              {itensAtuais.length === 0 && (
                <div className="empty" style={{ position: 'absolute', inset: 0 }}>
                  Sem dados de investimento para exibir.
                </div>
              )}
              <div
                ref={tooltipInvestRef}
                className="treemap-tooltip-instant"
                style={{ position: 'absolute', pointerEvents: 'none', zIndex: 100 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
