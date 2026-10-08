'use client';

import React from 'react';
import { X, Calendar, CalendarSync } from 'lucide-react';

interface NewLaunchTypeModalProps {
  aberto: boolean;
  onFechar: () => void;
  onEscolherPontual: () => void;
  onEscolherRecorrente: () => void;
}

export default function NewLaunchTypeModal({
  aberto,
  onFechar,
  onEscolherPontual,
  onEscolherRecorrente,
}: NewLaunchTypeModalProps) {
  if (!aberto) return null;

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div
        className="modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Novo Lançamento
            </div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              Escolha como deseja registrar no fluxo de caixa
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
          {/* Opção 1: Lançamento Pontual */}
          <button
            type="button"
            onClick={() => {
              onFechar();
              onEscolherPontual();
            }}
            className="launch-type-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #334155)',
              background: 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
              e.currentTarget.style.borderColor = 'var(--accent, #38bdf8)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--border-color, #334155)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary, #f8fafc)', marginBottom: '3px' }}>
                Lançamento Pontual
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                Um único lançamento
              </div>
            </div>
          </button>

          {/* Opção 2: Lançamento Recorrente */}
          <button
            type="button"
            onClick={() => {
              onFechar();
              onEscolherRecorrente();
            }}
            className="launch-type-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #334155)',
              background: 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)';
              e.currentTarget.style.borderColor = '#a855f7';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--border-color, #334155)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarSync size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary, #f8fafc)', marginBottom: '3px' }}>
                Lançamento Recorrente
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                Gera lançamentos mensais dentro de um período
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
