'use client';

import React, { useState, useEffect } from 'react';
import { CalendarSync, TrendingUp, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface MirrorYearModalProps {
  aberto: boolean;
  anosDisponiveis: number[];
  onFechar: () => void;
  onSucesso: () => void;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function MirrorYearModal({
  aberto,
  anosDisponiveis,
  onFechar,
  onSucesso,
}: MirrorYearModalProps) {
  const anoPadraoOrigem = anosDisponiveis.length > 0 ? anosDisponiveis[0] : new Date().getFullYear();

  const [anoOrigem, setAnoOrigem] = useState<number>(anoPadraoOrigem);
  const [anoDestino, setAnoDestino] = useState<number>(anoPadraoOrigem + 1);
  const [reajusteReceitas, setReajusteReceitas] = useState<number>(5);
  const [reajusteDespesas, setReajusteDespesas] = useState<number>(6);
  const [statusPadrao, setStatusPadrao] = useState<string>('À Pagar / À Receber');
  const [limparAnoDestino, setLimparAnoDestino] = useState<boolean>(true);

  const [carregando, setCarregando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    estatisticas?: {
      quantidade: number;
      totalEntradas: number;
      totalSaidas: number;
      resultado: number;
    };
  } | null>(null);

  useEffect(() => {
    if (aberto) {
      const origem = anosDisponiveis.length > 0 ? anosDisponiveis[0] : new Date().getFullYear();
      setAnoOrigem(origem);
      setAnoDestino(origem + 1);
      setReajusteReceitas(5);
      setReajusteDespesas(6);
      setStatusPadrao('À Pagar / À Receber');
      setLimparAnoDestino(true);
      setResultado(null);
    }
  }, [aberto, anosDisponiveis]);

  if (!aberto) return null;

  const executarEspelhamento = async () => {
    if (anoOrigem === anoDestino) {
      alert('O ano de destino deve ser diferente do ano de origem.');
      return;
    }

    setCarregando(true);
    setResultado(null);

    try {
      const res = await fetch('/api/espelhar-ano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anoOrigem,
          anoDestino,
          reajusteReceitasPct: reajusteReceitas,
          reajusteDespesasPct: reajusteDespesas,
          statusPadrao,
          limparAnoDestinoAntes: limparAnoDestino,
        }),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        setResultado({
          sucesso: true,
          mensagem: data.mensagem,
          estatisticas: data.estatisticas,
        });

        setTimeout(() => {
          onSucesso();
          onFechar();
        }, 1800);
      } else {
        setResultado({
          sucesso: false,
          mensagem: data.erro || 'Erro ao processar espelhamento anual.',
        });
      }
    } catch (err: any) {
      setResultado({
        sucesso: false,
        mensagem: err.message || 'Falha na conexão com o servidor.',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal" style={{ width: 'min(680px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <CalendarSync size={18} style={{ color: 'var(--primary)' }} />
              <span>Espelhar e Projetar Fluxo Anual</span>
            </div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              Replique um ano inteiro com reajustes percentuais (%) automáticos para orçamento
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          {/* Seleção de Anos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label>Ano Base de Origem</label>
              <select
                value={anoOrigem}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAnoOrigem(val);
                  if (anoDestino <= val) setAnoDestino(val + 1);
                }}
              >
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Ano de onde os lançamentos serão lidos
              </div>
            </div>

            <div>
              <label>Ano de Destino (Projetado)</label>
              <input
                type="number"
                value={anoDestino}
                onChange={(e) => setAnoDestino(Number(e.target.value))}
                min={2000}
                max={2100}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Ano para onde os novos lançamentos serão gravados
              </div>
            </div>
          </div>

          {/* Reajustes Percentuais */}
          <div style={{ background: 'var(--card-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
              <span>Ajustes Percentuais para o Novo Ano</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Reajuste Entradas */}
              <div>
                <label style={{ color: 'var(--positive)' }}>Reajuste em Entradas / Receitas (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="number"
                    step="0.1"
                    value={reajusteReceitas}
                    onChange={(e) => setReajusteReceitas(Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: 14 }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--muted)' }}>%</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[0, 3, 5, 8, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="btn small secondary"
                      onClick={() => setReajusteReceitas(pct)}
                      style={{ fontSize: 10, padding: '2px 6px' }}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reajuste Saídas */}
              <div>
                <label style={{ color: 'var(--negative)' }}>Reajuste em Saídas / Despesas (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="number"
                    step="0.1"
                    value={reajusteDespesas}
                    onChange={(e) => setReajusteDespesas(Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: 14 }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--muted)' }}>%</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[0, 4, 6, 8, 12].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="btn small secondary"
                      onClick={() => setReajusteDespesas(pct)}
                      style={{ fontSize: 10, padding: '2px 6px' }}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Opções de Gravação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'center' }}>
            <div>
              <label>Status dos Novos Lançamentos</label>
              <select
                value={statusPadrao}
                onChange={(e) => setStatusPadrao(e.target.value)}
                style={{ height: 36 }}
              >
                <option value="À Pagar / À Receber">À Pagar / À Receber (Recomendado para projeções)</option>
                <option value="Pago / Recebido">Pago / Recebido</option>
                <option value="Original">Manter status original de cada lançamento</option>
              </select>
            </div>

            <div style={{ paddingTop: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', fontSize: 12, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={limparAnoDestino}
                  onChange={(e) => setLimparAnoDestino(e.target.checked)}
                  style={{ width: 'auto', height: 'auto' }}
                />
                Substituir ano {anoDestino} se já existir no banco
              </label>
            </div>
          </div>

          {/* Resultado de Feedback */}
          {resultado && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: resultado.sucesso ? 'var(--positive-bg)' : 'var(--negative-bg)',
                color: resultado.sucesso ? 'var(--positive)' : 'var(--negative)',
                border: `1px solid ${resultado.sucesso ? 'var(--positive)' : 'var(--negative)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: resultado.estatisticas ? 6 : 0 }}>
                {resultado.sucesso ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{resultado.mensagem}</span>
              </div>
              {resultado.estatisticas && (
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>
                  Entradas Projetadas: <strong>{moeda(resultado.estatisticas.totalEntradas)}</strong> &bull; Saídas
                  Projetadas: <strong>{moeda(resultado.estatisticas.totalSaidas)}</strong> &bull; Resultado: <strong>{moeda(resultado.estatisticas.resultado)}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onFechar} disabled={carregando}>
            Cancelar
          </button>
          <button className="btn" onClick={executarEspelhamento} disabled={carregando}>
            <Sparkles size={15} />
            {carregando ? 'Gerando projeção...' : `Gerar Fluxo de ${anoDestino}`}
          </button>
        </div>
      </div>
    </div>
  );
}
