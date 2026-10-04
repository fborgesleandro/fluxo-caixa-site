'use client';

import React, { useMemo } from 'react';
import MultiSelectFilter, { MultiSelectOption } from './MultiSelectFilter';

export interface FiltrosState {
  ano: string[];
  mes: string[];
  natureza: string[];
  grupo: string[];
  status: string[];
  categoria: string[];
  subcategoria: string[];
  responsavel: string[];
  dataInicio: string;
  dataFim: string;
  texto: string;
}

export interface OpcoesFiltros {
  anos: number[];
  meses: { numero: number; nome: string }[];
  naturezas: string[];
  grupos: string[];
  categorias: string[];
  subcategorias: string[];
  responsaveis: string[];
  status: string[];
}

interface FilterBarProps {
  filtros: FiltrosState;
  opcoes: OpcoesFiltros;
  onChange: (campo: keyof FiltrosState, valor: string[] | string) => void;
  onLimparCampo: (campo: keyof FiltrosState) => void;
}

export default function FilterBar({
  filtros,
  opcoes,
  onChange,
  onLimparCampo,
}: FilterBarProps) {
  const datasLiberadas = filtros.ano.length === 0 && filtros.mes.length === 0;

  const opcoesAnos: MultiSelectOption[] = useMemo(
    () => opcoes.anos.map((ano) => ({ value: String(ano), label: String(ano) })),
    [opcoes.anos]
  );

  const opcoesMeses: MultiSelectOption[] = useMemo(
    () =>
      opcoes.meses.map((m) => ({
        value: String(m.numero),
        label: m.nome || String(m.numero),
      })),
    [opcoes.meses]
  );

  const opcoesNaturezas: MultiSelectOption[] = useMemo(
    () => opcoes.naturezas.map((nat) => ({ value: nat, label: nat })),
    [opcoes.naturezas]
  );

  const opcoesGrupos: MultiSelectOption[] = useMemo(
    () => opcoes.grupos.map((grp) => ({ value: grp, label: grp })),
    [opcoes.grupos]
  );

  const opcoesStatus: MultiSelectOption[] = useMemo(
    () => opcoes.status.map((st) => ({ value: st, label: st })),
    [opcoes.status]
  );

  const opcoesCategorias: MultiSelectOption[] = useMemo(
    () => opcoes.categorias.map((cat) => ({ value: cat, label: cat })),
    [opcoes.categorias]
  );

  const opcoesSubcategorias: MultiSelectOption[] = useMemo(
    () => opcoes.subcategorias.map((sub) => ({ value: sub, label: sub })),
    [opcoes.subcategorias]
  );

  const opcoesResponsaveis: MultiSelectOption[] = useMemo(
    () => opcoes.responsaveis.map((resp) => ({ value: resp, label: resp })),
    [opcoes.responsaveis]
  );

  return (
    <section className="filters">
      {/* 1. Ano */}
      <MultiSelectFilter
        label="Ano"
        options={opcoesAnos}
        selected={filtros.ano}
        onChange={(novos) => onChange('ano', novos)}
        onClear={() => onLimparCampo('ano')}
        labelTodos="Todos"
      />

      {/* 2. Mês */}
      <MultiSelectFilter
        label="Mês"
        options={opcoesMeses}
        selected={filtros.mes}
        onChange={(novos) => onChange('mes', novos)}
        onClear={() => onLimparCampo('mes')}
        labelTodos="Todos"
      />

      {/* 3. Natureza */}
      <MultiSelectFilter
        label="Natureza"
        options={opcoesNaturezas}
        selected={filtros.natureza}
        onChange={(novos) => onChange('natureza', novos)}
        onClear={() => onLimparCampo('natureza')}
        labelTodos="Todas"
      />

      {/* 4. Grupo */}
      <MultiSelectFilter
        label="Grupo"
        options={opcoesGrupos}
        selected={filtros.grupo}
        onChange={(novos) => onChange('grupo', novos)}
        onClear={() => onLimparCampo('grupo')}
        labelTodos="Todos"
      />

      {/* 5. Status */}
      <MultiSelectFilter
        label="Status"
        options={opcoesStatus}
        selected={filtros.status}
        onChange={(novos) => onChange('status', novos)}
        onClear={() => onLimparCampo('status')}
        labelTodos="Todos"
      />

      {/* 6. Categoria */}
      <MultiSelectFilter
        label="Categoria"
        options={opcoesCategorias}
        selected={filtros.categoria}
        onChange={(novos) => onChange('categoria', novos)}
        onClear={() => onLimparCampo('categoria')}
        labelTodos="Todas"
      />

      {/* 7. Subcategoria */}
      <MultiSelectFilter
        label="Subcategoria"
        options={opcoesSubcategorias}
        selected={filtros.subcategoria}
        onChange={(novos) => onChange('subcategoria', novos)}
        onClear={() => onLimparCampo('subcategoria')}
        labelTodos="Todas"
      />

      {/* 8. Responsável */}
      <MultiSelectFilter
        label="Responsável"
        options={opcoesResponsaveis}
        selected={filtros.responsavel}
        onChange={(novos) => onChange('responsavel', novos)}
        onClear={() => onLimparCampo('responsavel')}
        labelTodos="Todos"
      />

      {/* 9. Data Início (Intervalo Livre) */}
      <div className="filter-item">
        <div className="filter-head">
          <label>Data Início</label>
          {filtros.dataInicio && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => onLimparCampo('dataInicio')}
              title="Limpar data início"
            >
              &times;
            </button>
          )}
        </div>
        <input
          type="date"
          disabled={!datasLiberadas}
          value={filtros.dataInicio}
          onChange={(e) => onChange('dataInicio', e.target.value)}
          title={
            datasLiberadas
              ? 'Intervalo livre de datas'
              : 'Limpe os filtros de ano e mês para utilizar intervalo livre.'
          }
        />
      </div>

      {/* 10. Data Fim (Intervalo Livre) */}
      <div className="filter-item">
        <div className="filter-head">
          <label>Data Fim</label>
          {filtros.dataFim && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => onLimparCampo('dataFim')}
              title="Limpar data fim"
            >
              &times;
            </button>
          )}
        </div>
        <input
          type="date"
          disabled={!datasLiberadas}
          value={filtros.dataFim}
          onChange={(e) => onChange('dataFim', e.target.value)}
          title={
            datasLiberadas
              ? 'Intervalo livre de datas'
              : 'Limpe os filtros de ano e mês para utilizar intervalo livre.'
          }
        />
      </div>
    </section>
  );
}
