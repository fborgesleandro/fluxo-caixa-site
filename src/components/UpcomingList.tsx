'use client';

import React, { useState, useMemo } from 'react';
import { LancamentoItem } from './CashFlowChart';

interface UpcomingListProps {
  dados: LancamentoItem[];
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

function dataLocalISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function UpcomingList({ dados }: UpcomingListProps) {
  const hojeStr = useMemo(() => dataLocalISO(new Date()), []);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const proximos = useMemo(() => {
    // Se o usuário informou filtro explícito de período ao lado do título
    if (dataInicio || dataFim) {
      return dados
        .filter((x) => {
          if (!x.dataLcto) return false;
          if (dataInicio && x.dataLcto < dataInicio) return false;
          if (dataFim && x.dataLcto > dataFim) return false;
          return true;
        })
        .sort((a, b) => a.dataLcto.localeCompare(b.dataLcto))
        .slice(0, 50);
    }

    // Por padrão (sem filtro explícito), sempre mostra os lançamentos a partir de hoje
    // e se não houver registros futuros no banco, mostra os lançamentos mais recentes
    const aPartirDeHoje = dados
      .filter((x) => x.dataLcto && x.dataLcto >= hojeStr)
      .sort((a, b) => a.dataLcto.localeCompare(b.dataLcto));

    if (aPartirDeHoje.length > 0) {
      return aPartirDeHoje.slice(0, 50);
    }

    // Fallback: se todos os dados forem passados, exibe os mais recentes para nunca ficar vazio
    return dados
      .filter((x) => Boolean(x.dataLcto))
      .sort((a, b) => b.dataLcto.localeCompare(a.dataLcto))
      .slice(0, 50);
  }, [dados, dataInicio, dataFim, hojeStr]);

  const limparPeriodos = () => {
    setDataInicio('');
    setDataFim('');
  };

  const preencherProximos15Dias = () => {
    const hoje = new Date();
    const mais15 = new Date(hoje);
    mais15.setDate(mais15.getDate() + 15);
    setDataInicio(dataLocalISO(hoje));
    setDataFim(dataLocalISO(mais15));
  };

  return (
    <div className="chart-box upcoming-box">
      <div className="upcoming-head" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>Próximos Lançamentos</div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>Lista baseada na Data LCTO</div>
          </div>
          {(dataInicio || dataFim) && (
            <button
              className="filter-clear"
              onClick={limparPeriodos}
              title="Limpar período de datas"
              style={{ width: 22, height: 22 }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Inputs de período perfeitamente ajustados para nunca ultrapassar o container */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
          <div>
            <label style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              title="Data inicial"
              style={{
                width: '100%',
                height: 30,
                fontSize: 11,
                padding: '0 6px',
                borderRadius: 6,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              title="Data final"
              style={{
                width: '100%',
                height: 30,
                fontSize: 11,
                padding: '0 6px',
                borderRadius: 6,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="upcoming-list" style={{ maxHeight: 310, overflowY: 'auto' }}>
        {proximos.length === 0 ? (
          <div className="empty">Nenhum lançamento no período filtrado.</div>
        ) : (
          proximos.map((x) => {
            const isReceita = x.natureza.toLowerCase() === 'receita';
            const sinal = isReceita ? '+' : '-';
            const classeValor = isReceita ? 'entrada' : 'saida';

            return (
              <div key={x.id} className="upcoming-item">
                <div>
                  <strong>{x.subcategoria || x.categoria || x.grupo || x.natureza}</strong>
                  <span>
                    {formatarData(x.dataLcto)} {x.responsavel ? `| ${x.responsavel}` : ''}
                  </span>
                </div>
                <div className={`upcoming-value ${classeValor}`}>
                  {sinal} {moeda(Math.abs(x.valor))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 10 }}>
        <button
          className="btn small secondary"
          onClick={preencherProximos15Dias}
          style={{ fontSize: 10, padding: '4px 8px' }}
        >
          Filtrar próximos 15 dias
        </button>
        {(dataInicio || dataFim) && (
          <button
            className="btn small secondary"
            onClick={limparPeriodos}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            Limpar período
          </button>
        )}
      </div>
    </div>
  );
}
