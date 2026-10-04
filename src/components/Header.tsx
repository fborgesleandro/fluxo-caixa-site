'use client';

import React from 'react';
import { UploadCloud, CalendarSync, Trash2, LogOut, User, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  usuarioNome: string;
  totalRegistros: number;
  tema: 'dark' | 'light';
  onAlternarTema: () => void;
  onLimparFiltros: () => void;
  onAbrirImportacao: () => void;
  onAbrirEspelharAno: () => void;
  onAbrirExcluirAno: () => void;
  onLogout: () => void;
}

export default function Header({
  usuarioNome,
  totalRegistros,
  tema,
  onAlternarTema,
  onLimparFiltros,
  onAbrirImportacao,
  onAbrirEspelharAno,
  onAbrirExcluirAno,
  onLogout,
}: HeaderProps) {
  return (
    <header>
      <div>
        <div className="header-title">Fluxo de Caixa</div>
        <div className="header-subtitle">Gestão financeira pessoal</div>
      </div>

      <div className="header-right">
        {usuarioNome && (
          <div className="user-badge">
            <User size={13} />
            <span>{usuarioNome}</span>
          </div>
        )}

        {/* Botão de Alternar Modo Claro / Escuro */}
        <button
          className="btn header-clear theme-toggle-btn"
          onClick={onAlternarTema}
          title={tema === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {tema === 'dark' ? (
            <>
              <Sun size={14} style={{ color: '#fbbf24' }} />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon size={14} style={{ color: '#93c5fd' }} />
              <span>Modo Escuro</span>
            </>
          )}
        </button>

        <button
          className="btn header-clear"
          onClick={onAbrirEspelharAno}
          title="Espelhar e projetar lançamentos para o próximo ano com reajuste percentual"
        >
          <CalendarSync size={13} />
          <span>Espelhar Ano / Orçamento</span>
        </button>

        <button
          className="btn header-clear"
          onClick={onAbrirExcluirAno}
          title="Excluir uma base anual inteira do banco de dados (ex: 2027)"
        >
          <Trash2 size={13} style={{ color: '#f87171' }} />
          <span>Excluir Base Anual</span>
        </button>

        <button
          className="btn header-clear"
          onClick={onAbrirImportacao}
          title="Importar dados da planilha Google Sheets"
        >
          <UploadCloud size={13} />
          <span>Importar Planilha</span>
        </button>

        <button
          className="btn header-clear"
          onClick={onLimparFiltros}
          title="Limpar todos os filtros"
        >
          Limpar filtros
        </button>

        <button
          className="btn header-clear"
          onClick={onLogout}
          title="Sair do sistema"
        >
          <LogOut size={13} />
          <span>Sair</span>
        </button>

        <div className="update-status">
          {totalRegistros} registros carregados | Banco: SQLite
        </div>
      </div>
    </header>
  );
}
