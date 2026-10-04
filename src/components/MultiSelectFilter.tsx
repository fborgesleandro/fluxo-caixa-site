'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (novosSelecionados: string[]) => void;
  onClear: () => void;
  labelTodos?: string;
  disabled?: boolean;
}

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  onClear,
  labelTodos = 'Todos',
  disabled = false,
}: MultiSelectFilterProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener('mousedown', handleClickFora);
      return () => document.removeEventListener('mousedown', handleClickFora);
    }
  }, [aberto]);

  // Fechar ao teclar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [aberto]);

  // Opções filtradas pela busca interna
  const opcoesFiltradas = useMemo(() => {
    if (!busca.trim()) return options;
    const b = busca.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(b));
  }, [options, busca]);

  // Se nenhum está selecionado explicitamente
  const isNoneSelected = selected.includes('__NONE__');

  // Se todos estão selecionados (quando selected está vazio ou contém todas as opções)
  const isTodosSelecionados =
    !isNoneSelected && (selected.length === 0 || (options.length > 0 && selected.length === options.length));

  // Texto exibido no trigger
  const textoExibido = useMemo(() => {
    if (disabled) return 'Desabilitado';
    if (isNoneSelected) return 'Nenhum';
    if (isTodosSelecionados) return labelTodos;
    if (selected.length === 0) return labelTodos;

    const mapaLabels = new Map(options.map((o) => [o.value, o.label]));
    const labelsSelecionadas = selected
      .filter((val) => val !== '__NONE__')
      .map((val) => mapaLabels.get(val) || val)
      .filter(Boolean);

    if (labelsSelecionadas.length === 0) return labelTodos;
    if (labelsSelecionadas.length === 1) return labelsSelecionadas[0];
    if (labelsSelecionadas.length <= 2) return labelsSelecionadas.join(', ');
    return `${labelsSelecionadas.length} selecionados`;
  }, [disabled, isNoneSelected, isTodosSelecionados, labelTodos, selected, options]);

  // Ação de Selecionar Todos
  const toggleSelecionarTodos = () => {
    if (isTodosSelecionados) {
      // Desmarca todos para permitir seleção específica
      onChange(['__NONE__']);
    } else {
      // Marca todos (resetando para vazio, que representa todos ativos)
      onChange([]);
    }
  };

  // Alternar um item individual
  const toggleItem = (valor: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isNoneSelected) {
      onChange([valor]);
      return;
    }

    if (selected.length === 0) {
      // Se atualmente "Todos" está ativo (selected vazio) e o usuário clica num item, isola esse item
      onChange([valor]);
      return;
    }

    if (selected.includes(valor)) {
      const novos = selected.filter((v) => v !== valor);
      if (novos.length === 0) {
        onChange(['__NONE__']);
      } else {
        onChange(novos);
      }
    } else {
      const novos = [...selected.filter((v) => v !== '__NONE__'), valor];
      if (novos.length === options.length) {
        onChange([]);
      } else {
        onChange(novos);
      }
    }
  };

  // Selecionar APENAS este item com 1 clique
  const selecionarApenas = (valor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([valor]);
  };

  const temFiltroAtivo = isNoneSelected || (selected.length > 0 && selected.length < options.length);

  return (
    <div className="filter-item" ref={containerRef}>
      <div className="filter-head">
        <label>{label}</label>
        {temFiltroAtivo && !disabled && (
          <button
            type="button"
            className="filter-clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            title={`Limpar filtro de ${label}`}
          >
            &times;
          </button>
        )}
      </div>

      <div className="multi-select-container">
        <button
          type="button"
          className={`multi-select-trigger ${aberto ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setAberto((prev) => !prev)}
          disabled={disabled}
          title={textoExibido}
        >
          <span className="multi-select-text">{textoExibido}</span>
          <ChevronDown
            size={14}
            className={`multi-select-chevron ${aberto ? 'rotated' : ''}`}
          />
        </button>

        {aberto && !disabled && (
          <div className="multi-select-dropdown">
            {/* Campo de Busca Rápida (quando houver mais de 5 itens) */}
            {options.length > 5 && (
              <div className="multi-select-search">
                <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={`Buscar em ${label}...`}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  autoFocus
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    style={{
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      padding: 2,
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Linha "Selecionar Todos" */}
            <div className="multi-select-all-row" onClick={toggleSelecionarTodos}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text)',
                  width: '100%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isTodosSelecionados}
                  onChange={toggleSelecionarTodos}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <span>Selecionar Todos ({options.length})</span>
              </label>

              {!isTodosSelecionados && (
                <button
                  type="button"
                  className="multi-select-quick-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  title="Limpar seleção"
                >
                  Todos
                </button>
              )}
            </div>

            {/* Lista de Opções */}
            <div className="multi-select-list">
              {opcoesFiltradas.length === 0 ? (
                <div className="multi-select-empty">Nenhum item encontrado</div>
              ) : (
                opcoesFiltradas.map((opt) => {
                  const isChecked = !isNoneSelected && (isTodosSelecionados || selected.includes(opt.value));

                  return (
                    <div
                      key={opt.value}
                      className={`multi-select-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleItem(opt.value)}
                    >
                      <div className="multi-select-item-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(opt.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span title={opt.label}>{opt.label}</span>
                      </div>

                      <button
                        type="button"
                        className="multi-select-only-btn"
                        onClick={(e) => selecionarApenas(opt.value, e)}
                        title={`Filtrar apenas por "${opt.label}"`}
                      >
                        Apenas
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
