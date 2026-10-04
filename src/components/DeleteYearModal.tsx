'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { LancamentoItem } from './CashFlowChart';

interface DeleteYearModalProps {
  aberto: boolean;
  anosDisponiveis: number[];
  lancamentos: LancamentoItem[];
  onFechar: () => void;
  onSucesso: () => void;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function DeleteYearModal({
  aberto,
  anosDisponiveis,
  lancamentos,
  onFechar,
  onSucesso,
}: DeleteYearModalProps) {
  const [anoSelecionado, setAnoSelecionado] = useState<number>(
    anosDisponiveis.length > 0 ? anosDisponiveis[0] : new Date().getFullYear()
  );
  const [confirmado, setConfirmado] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
  } | null>(null);

  useEffect(() => {
    if (aberto) {
      if (anosDisponiveis.length > 0 && !anosDisponiveis.includes(anoSelecionado)) {
        setAnoSelecionado(anosDisponiveis[0]);
      }
      setConfirmado(false);
      setResultado(null);
    }
  }, [aberto, anosDisponiveis, anoSelecionado]);

  // Estatísticas do ano selecionado
  const estatisticasAno = useMemo(() => {
    const doAno = lancamentos.filter((x) => x.ano === anoSelecionado);
    let receitas = 0;
    let despesas = 0;

    doAno.forEach((x) => {
      const nat = String(x.natureza || '').toLowerCase();
      const val = Math.abs(x.valor);
      if (nat === 'receita') {
        receitas += val;
      } else {
        despesas += val;
      }
    });

    return {
      quantidade: doAno.length,
      receitas,
      despesas,
    };
  }, [lancamentos, anoSelecionado]);

  if (!aberto) return null;

  const executarExclusao = async () => {
    if (!anoSelecionado) {
      alert('Selecione um ano para excluir.');
      return;
    }

    if (!confirmado) {
      alert(`Por favor, marque a caixa de confirmação para autorizar a exclusão do ano ${anoSelecionado}.`);
      return;
    }

    setCarregando(true);
    setResultado(null);

    try {
      const res = await fetch('/api/excluir-ano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: anoSelecionado }),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        setResultado({ sucesso: true, mensagem: data.mensagem });
        setTimeout(() => {
          onSucesso();
          onFechar();
        }, 1200);
      } else {
        setResultado({
          sucesso: false,
          mensagem: data.erro || 'Falha ao excluir a base anual.',
        });
      }
    } catch {
      setResultado({
        sucesso: false,
        mensagem: 'Erro de conexão com o servidor ao excluir a base.',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div
        className="modal"
        style={{ width: 'min(540px, 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div
              className="section-title"
              style={{
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#ef4444',
              }}
            >
              <Trash2 size={20} />
              <span>Excluir Base Anual</span>
            </div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              Apague todos os lançamentos de um ano específico do banco de dados
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          {/* Seletor de Ano */}
          <div>
            <label>Selecione o Ano a Excluir</label>
            <select
              value={anoSelecionado}
              onChange={(e) => {
                setAnoSelecionado(Number(e.target.value));
                setConfirmado(false);
              }}
              style={{ marginTop: 4, height: 42, fontSize: 15, fontWeight: 700 }}
            >
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  Ano {a} ({lancamentos.filter((x) => x.ano === a).length} lançamentos)
                </option>
              ))}
            </select>
          </div>

          {/* Resumo do que será afetado */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              background: 'var(--card-subtle)',
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Registros</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: 'var(--text)' }}>
                {estatisticasAno.quantidade}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Receitas</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: 'var(--positive)' }}>
                {moeda(estatisticasAno.receitas)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Despesas</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: 'var(--negative)' }}>
                {moeda(estatisticasAno.despesas)}
              </div>
            </div>
          </div>

          {/* Alerta de Perigo */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--text)',
              fontSize: 12,
              lineHeight: 1.5,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#ef4444' }}>Ação Irreversível:</strong> Todos os lançamentos
              vinculados ao ano <strong>{anoSelecionado}</strong> serão permanentemente excluídos do
              banco SQLite. Caso queira restaurá-los depois, certifique-se de ter um backup ou exportação CSV.
            </div>
          </div>

          {/* Checkbox de Segurança */}
          <div style={{ padding: '4px 0' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#ef4444' }}
              />
              <span>
                Tenho certeza que desejo excluir definitivamente todos os registros de {anoSelecionado}
              </span>
            </label>
          </div>

          {/* Banner de Feedback */}
          {resultado && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: resultado.sucesso ? 'var(--positive-bg)' : 'var(--negative-bg)',
                color: resultado.sucesso ? 'var(--positive)' : 'var(--negative)',
                border: `1px solid ${resultado.sucesso ? 'var(--positive)' : 'var(--negative)'}`,
              }}
            >
              {resultado.sucesso ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{resultado.mensagem}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onFechar} disabled={carregando}>
            Cancelar
          </button>
          <button
            className="btn danger"
            onClick={executarExclusao}
            disabled={carregando || !confirmado}
            style={{ opacity: confirmado ? 1 : 0.6 }}
          >
            <Trash2 size={14} />
            {carregando ? 'Excluindo base...' : `Excluir Ano ${anoSelecionado}`}
          </button>
        </div>
      </div>
    </div>
  );
}
