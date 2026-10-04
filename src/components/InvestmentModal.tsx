'use client';

import React, { useState } from 'react';
import { InvestimentoItem } from './InvestmentsView';
import { X } from 'lucide-react';

interface InvestmentModalProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (item: Partial<InvestimentoItem>, criarNovoHistorico: boolean) => Promise<void>;
}

export default function InvestmentModal({
  aberto,
  onFechar,
  onSalvar,
}: InvestmentModalProps) {
  const [banco, setBanco] = useState('');
  const [tipo, setTipo] = useState('');
  const [valor, setValor] = useState<string>('');
  const [dataAtualizacao, setDataAtualizacao] = useState(
    new Date().toISOString().slice(0, 10)
  );

  if (!aberto) return null;

  const salvar = async () => {
    if (!banco.trim() || !tipo.trim() || !valor) {
      alert('Informe Banco, Tipo e Valor.');
      return;
    }
    await onSalvar(
      {
        banco: banco.trim().toUpperCase(),
        tipo: tipo.trim(),
        valor: Number(valor),
        dataAtualizacao,
      },
      true
    );
    setBanco('');
    setTipo('');
    setValor('');
    onFechar();
  };

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Nova Atualização de Investimento
            </div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              Grava uma nova posição para preservar o histórico e evolução
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <label>Banco / Instituição</label>
            <input
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ex: NUBANK, PICPAY, SWILE, XP"
              autoFocus
            />
          </div>

          <div>
            <label>Tipo de Investimento</label>
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex: Caixinha Turbo, CDB 102%, Bolsa de Valores"
            />
          </div>

          <div>
            <label>Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label>Data da Atualização</label>
            <input
              type="date"
              value={dataAtualizacao}
              onChange={(e) => setDataAtualizacao(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn" onClick={salvar}>
            Salvar Nova Atualização
          </button>
        </div>
      </div>
    </div>
  );
}
