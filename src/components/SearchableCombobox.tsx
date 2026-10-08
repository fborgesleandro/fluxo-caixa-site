'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SearchableComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

export default function SearchableCombobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione ou digite...',
  required = false,
}: SearchableComboboxProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza busca com o value externo quando ele muda
  useEffect(() => {
    setBusca(value || '');
  }, [value]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar opções disponíveis
  const opcoesFiltradas = options.filter((op) =>
    op.toLowerCase().includes(busca.toLowerCase().trim())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusca(val);
    onChange(val);
    if (!aberto) setAberto(true);
  };

  const handleSelectOption = (op: string) => {
    setBusca(op);
    onChange(op);
    setAberto(false);
  };

  return (
    <div className="combobox-container" ref={containerRef} style={{ position: 'relative' }}>
      {label && <label>{label}</label>}

      <div className="combobox-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={handleInputChange}
          onFocus={() => setAberto(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{ width: '100%', paddingRight: '28px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setAberto((prev) => !prev);
            inputRef.current?.focus();
          }}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted, #94a3b8)',
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {aberto && (
        <div
          className="combobox-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            padding: '4px',
          }}
        >
          {opcoesFiltradas.length > 0 ? (
            opcoesFiltradas.map((op) => {
              const selecionado = op.toLowerCase() === value.toLowerCase();
              return (
                <div
                  key={op}
                  onClick={() => handleSelectOption(op)}
                  className="combobox-item"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: selecionado ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: selecionado ? 'var(--accent, #38bdf8)' : 'var(--text-primary, #f8fafc)',
                    fontWeight: selecionado ? 600 : 400,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!selecionado) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selecionado) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{op}</span>
                  {selecionado && <Check size={14} />}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)',
                fontStyle: 'italic',
              }}
            >
              {busca ? (
                <>
                  Pressione Enter para usar <strong>&quot;{busca}&quot;</strong> (novo)
                </>
              ) : (
                'Nenhuma sugestão disponível'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
