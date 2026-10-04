'use client';

import React, { useState } from 'react';
import { LancamentoItem } from './CashFlowChart';
import { Plus, Trash2, Edit2, Check, X, Search, Download } from 'lucide-react';

interface TransactionsTableProps {
  dados: LancamentoItem[];
  onSalvar: (lancamento: Partial<LancamentoItem>) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  textoFiltro: string;
  onTextoFiltroChange: (texto: string) => void;
  opcoesSugestoes: {
    grupos: string[];
    categorias: string[];
    subcategorias: string[];
    responsaveis: string[];
    status: string[];
  };
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

function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getStatusOpcoesPorNatureza(natureza?: string): string[] {
  const nat = String(natureza || '').toLowerCase().trim();
  if (nat === 'receita') {
    return ['Recebido', 'À Receber'];
  }
  // Despesa ou Custo
  return ['Pago', 'À Pagar'];
}

export function ajustarStatusPorNatureza(novaNatureza?: string, statusAtual?: string): string {
  const opcoesValidas = getStatusOpcoesPorNatureza(novaNatureza);
  if (!statusAtual) return opcoesValidas[0];

  const stTrim = String(statusAtual).trim();
  if (opcoesValidas.includes(stTrim)) return stTrim;

  // Conversões inteligentes
  if (stTrim === 'Pago') return 'Recebido';
  if (stTrim === 'Recebido') return 'Pago';
  if (stTrim === 'À Pagar' || stTrim === 'A Pagar') return 'À Receber';
  if (stTrim === 'À Receber' || stTrim === 'A Receber') return 'À Pagar';
  if (stTrim === 'Realizado') return String(novaNatureza).toLowerCase().trim() === 'receita' ? 'Recebido' : 'Pago';

  return opcoesValidas[0];
}

export default function TransactionsTable({
  dados,
  onSalvar,
  onExcluir,
  textoFiltro,
  onTextoFiltroChange,
  opcoesSugestoes,
}: TransactionsTableProps) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null);

  // Estado para duplicação inline e no painel
  const [duplicandoOrigemId, setDuplicandoOrigemId] = useState<string | null>(null);
  const [formDuplicar, setFormDuplicar] = useState<Partial<LancamentoItem>>({});
  const [isPainelDuplicando, setIsPainelDuplicando] = useState(false);

  // Formulário do painel de edição rápido
  const [formPainel, setFormPainel] = useState<Partial<LancamentoItem>>({
    natureza: 'Despesa',
    status: 'Pago',
  });

  // Formulário de edição inline na tabela
  const [formInline, setFormInline] = useState<Partial<LancamentoItem>>({});

  const limparPainel = () => {
    setFormPainel({
      natureza: 'Despesa',
      status: 'Pago',
      dataLcto: '',
      competencia: '',
      grupo: '',
      categoria: '',
      subcategoria: '',
      responsavel: '',
      valor: undefined,
    });
    setSelecionadoId(null);
    setIsPainelDuplicando(false);
  };

  const selecionarLinha = (item: LancamentoItem) => {
    setSelecionadoId(item.id);
    setIsPainelDuplicando(false);
    const nat = item.natureza || 'Despesa';
    setFormPainel({
      ...item,
      status: ajustarStatusPorNatureza(nat, item.status),
      valor: Math.abs(item.valor),
    });
  };

  const salvarPainel = async () => {
    if (!formPainel.dataLcto || !formPainel.natureza || formPainel.valor === undefined) {
      alert('Informe Data LCTO, Natureza e Valor.');
      return;
    }
    await onSalvar(formPainel);
    limparPainel();
  };

  const duplicarDoPainel = () => {
    if (!formPainel.id) {
      alert('Selecione um lançamento para duplicar.');
      return;
    }
    setFormPainel((prev) => ({
      ...prev,
      id: undefined, // remove o ID para que seja salvo como um novo lançamento
    }));
    setIsPainelDuplicando(true);
    setSelecionadoId(null);
  };

  const iniciarEdicaoInline = (item: LancamentoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Cancela duplicação se houver
    setDuplicandoOrigemId(null);
    setFormDuplicar({});
    setLinhaEmEdicao(item.id);
    const nat = item.natureza || 'Despesa';
    setFormInline({
      ...item,
      status: ajustarStatusPorNatureza(nat, item.status),
      valor: Math.abs(item.valor),
      competencia: item.competencia || item.dataLcto || '',
    });
  };

  const cancelarEdicaoInline = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLinhaEmEdicao(null);
    setFormInline({});
  };

  const salvarEdicaoInline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!formInline.id || !formInline.dataLcto || formInline.valor === undefined) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    await onSalvar(formInline);
    setLinhaEmEdicao(null);
    setFormInline({});
  };

  // Funções de Duplicação Inline
  const iniciarDuplicacao = (item: LancamentoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setLinhaEmEdicao(null);
    setFormInline({});
    setDuplicandoOrigemId(item.id);
    const nat = item.natureza || 'Despesa';
    setFormDuplicar({
      natureza: nat,
      grupo: item.grupo || '',
      categoria: item.categoria || '',
      subcategoria: item.subcategoria || '',
      responsavel: item.responsavel || '',
      status: ajustarStatusPorNatureza(nat, item.status),
      valor: Math.abs(item.valor),
      dataLcto: item.dataLcto || '',
      competencia: item.competencia || item.dataLcto || '',
      observacao: item.observacao || '',
    });
  };

  const cancelarDuplicacao = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDuplicandoOrigemId(null);
    setFormDuplicar({});
  };

  const salvarDuplicacao = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!formDuplicar.dataLcto || !formDuplicar.natureza || formDuplicar.valor === undefined) {
      alert('Informe Data LCTO, Natureza e Valor para salvar o lançamento duplicado.');
      return;
    }
    // Criação de novo lançamento sem ID
    await onSalvar({
      ...formDuplicar,
      id: undefined,
    });
    setDuplicandoOrigemId(null);
    setFormDuplicar({});
  };

  const abrirConfirmacaoExclusao = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmarExclusaoId(id);
  };

  const confirmarExclusao = async () => {
    if (confirmarExclusaoId) {
      await onExcluir(confirmarExclusaoId);
      if (selecionadoId === confirmarExclusaoId) {
        limparPainel();
      }
      setConfirmarExclusaoId(null);
    }
  };

  const exportarTabela = () => {
    if (dados.length === 0) {
      alert('Nenhum lançamento para exportar.');
      return;
    }

    const cabecalhos = [
      'Competência',
      'Data LCTO',
      'Natureza',
      'Grupo',
      'Categoria',
      'Subcategoria',
      'Responsável',
      'Valor',
      'Status',
      'Observação'
    ];

    const linhas = dados.map((x) => {
      const valStr = Number(x.valor).toFixed(2).replace('.', ',');
      return [
        x.competencia || '',
        x.dataLcto || '',
        x.natureza || '',
        x.grupo || '',
        x.categoria || '',
        x.subcategoria || '',
        x.responsavel || '',
        valStr,
        x.status || '',
        x.observacao || ''
      ]
        .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
        .join(';');
    });

    const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataHoje = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `fluxo-caixa-${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="table-box">
      <div className="table-header">
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>
            Lançamentos
          </div>
          <div className="table-count">{dados.length} lançamentos</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn secondary"
            onClick={exportarTabela}
            title="Download da tabela formatada para Excel (.csv tabulado com ;)"
          >
            <Download size={14} /> Exportar CSV / Excel
          </button>
          <button className="btn secondary" onClick={limparPainel}>
            Novo lançamento
          </button>
        </div>
      </div>

      {/* Painel de Edição Superior */}
      <section className="edit-panel">
        {isPainelDuplicando && (
          <div className="painel-duplicando-banner">
            ✨ <strong>Modo Duplicação:</strong> Dados clonados para um <strong>novo lançamento</strong>. Altere as variáveis necessárias e clique em <strong>Salvar Novo</strong>.
          </div>
        )}

        <div>
          <label>Competência</label>
          <input
            type="date"
            value={formPainel.competencia || ''}
            onChange={(e) =>
              setFormPainel({ ...formPainel, competencia: e.target.value })
            }
            title="Coluna calculada ou informada para competência"
          />
        </div>

        <div>
          <label>Data LCTO</label>
          <input
            type="date"
            value={formPainel.dataLcto || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormPainel((prev) => ({
                ...prev,
                dataLcto: val,
                competencia: (!prev.competencia || prev.competencia === prev.dataLcto) ? val : prev.competencia,
              }));
            }}
          />
        </div>

        <div>
          <label>Natureza</label>
          <select
            value={formPainel.natureza || 'Despesa'}
            onChange={(e) => {
              const novaNat = e.target.value;
              setFormPainel((prev) => ({
                ...prev,
                natureza: novaNat,
                status: ajustarStatusPorNatureza(novaNat, prev.status),
              }));
            }}
          >
            <option value="Receita">Receita</option>
            <option value="Despesa">Despesa</option>
            <option value="Custo">Custo</option>
          </select>
        </div>

        <div>
          <label>Grupo</label>
          <input
            list="sugestaoGrupos"
            value={formPainel.grupo || ''}
            onChange={(e) =>
              setFormPainel({ ...formPainel, grupo: e.target.value })
            }
          />
        </div>

        <div>
          <label>Categoria</label>
          <input
            list="sugestaoCategorias"
            value={formPainel.categoria || ''}
            onChange={(e) =>
              setFormPainel({ ...formPainel, categoria: e.target.value })
            }
          />
        </div>

        <div>
          <label>Subcategoria</label>
          <input
            list="sugestaoSubcategorias"
            value={formPainel.subcategoria || ''}
            onChange={(e) =>
              setFormPainel({ ...formPainel, subcategoria: e.target.value })
            }
          />
        </div>

        <div>
          <label>Responsável</label>
          <input
            list="sugestaoResponsaveis"
            value={formPainel.responsavel || ''}
            onChange={(e) =>
              setFormPainel({ ...formPainel, responsavel: e.target.value })
            }
          />
        </div>

        <div>
          <label>Valor</label>
          <input
            type="number"
            step="0.01"
            value={formPainel.valor ?? ''}
            onChange={(e) =>
              setFormPainel({
                ...formPainel,
                valor: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </div>

        <div className="edit-actions">
          <button className="btn secondary" onClick={limparPainel}>
            Limpar
          </button>
          {Boolean(formPainel.id) && (
            <button
              className="btn duplicate"
              onClick={duplicarDoPainel}
              title="Duplicar este lançamento para criar um novo registro com as variáveis ajustadas"
            >
              Duplicar
            </button>
          )}
          <button
            className="btn danger"
            onClick={() => {
              if (formPainel.id) setConfirmarExclusaoId(formPainel.id);
              else alert('Selecione um lançamento para excluir.');
            }}
          >
            Excluir
          </button>
          <button className="btn" onClick={salvarPainel}>
            {isPainelDuplicando ? 'Salvar Novo' : 'Salvar'}
          </button>
        </div>

        <div>
          <label>Status</label>
          <select
            value={formPainel.status || (formPainel.natureza === 'Receita' ? 'Recebido' : 'Pago')}
            onChange={(e) =>
              setFormPainel({ ...formPainel, status: e.target.value })
            }
          >
            {getStatusOpcoesPorNatureza(formPainel.natureza).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="edit-text-filter">
          <input
            className="text-filter"
            value={textoFiltro}
            onChange={(e) => onTextoFiltroChange(e.target.value)}
            placeholder="Filtrar texto em lançamentos..."
          />
        </div>
      </section>

      {/* Datalists de Autocomplete */}
      <datalist id="sugestaoGrupos">
        {opcoesSugestoes.grupos.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id="sugestaoCategorias">
        {opcoesSugestoes.categorias.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="sugestaoSubcategorias">
        {opcoesSugestoes.subcategorias.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sugestaoResponsaveis">
        {opcoesSugestoes.responsaveis.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {/* Tabela Desktop */}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Competência</th>
              <th>Data LCTO</th>
              <th>Natureza</th>
              <th>Grupo</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Responsável</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </div>
                </td>
              </tr>
            ) : (
              dados.map((x) => {
                const nat = normalizar(x.natureza);
                const sub = normalizar(x.subcategoria);
                const isSelected = selecionadoId === x.id;
                const isEditing = linhaEmEdicao === x.id;

                let rowClass = '';
                if (nat === 'receita') rowClass = 'linha-receita';
                else if (nat === 'despesa' || nat === 'custo') rowClass = 'linha-saida';
                if (sub.includes('outros')) rowClass += ' linha-outros';
                if (isSelected) rowClass += ' linha-selecionada';
                if (isEditing) rowClass += ' linha-em-edicao';

                const isDuplicatingThis = duplicandoOrigemId === x.id;

                if (isEditing) {
                  return (
                    <React.Fragment key={x.id}>
                      <tr className={rowClass}>
                        <td>
                          <input
                            type="date"
                            className="table-edit-input"
                            value={formInline.competencia || ''}
                            onChange={(e) =>
                              setFormInline({ ...formInline, competencia: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="table-edit-input"
                            value={formInline.dataLcto || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormInline((prev) => ({
                                ...prev,
                                dataLcto: val,
                                competencia: (!prev.competencia || prev.competencia === prev.dataLcto) ? val : prev.competencia,
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="table-edit-input"
                            value={formInline.natureza || 'Despesa'}
                            onChange={(e) => {
                              const novaNat = e.target.value;
                              setFormInline((prev) => ({
                                ...prev,
                                natureza: novaNat,
                                status: ajustarStatusPorNatureza(novaNat, prev.status),
                              }));
                            }}
                          >
                            <option value="Receita">Receita</option>
                            <option value="Despesa">Despesa</option>
                            <option value="Custo">Custo</option>
                          </select>
                        </td>
                        <td>
                          <input
                            list="sugestaoGrupos"
                            className="table-edit-input"
                            value={formInline.grupo || ''}
                            onChange={(e) =>
                              setFormInline({ ...formInline, grupo: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoCategorias"
                            className="table-edit-input"
                            value={formInline.categoria || ''}
                            onChange={(e) =>
                              setFormInline({ ...formInline, categoria: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoSubcategorias"
                            className="table-edit-input"
                            value={formInline.subcategoria || ''}
                            onChange={(e) =>
                              setFormInline({
                                ...formInline,
                                subcategoria: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoResponsaveis"
                            className="table-edit-input"
                            value={formInline.responsavel || ''}
                            onChange={(e) =>
                              setFormInline({
                                ...formInline,
                                responsavel: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="table-edit-input"
                            style={{ textAlign: 'right' }}
                            value={formInline.valor ?? ''}
                            onChange={(e) =>
                              setFormInline({
                                ...formInline,
                                valor: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="table-edit-input"
                            value={formInline.status || (formInline.natureza === 'Receita' ? 'Recebido' : 'Pago')}
                            onChange={(e) =>
                              setFormInline({ ...formInline, status: e.target.value })
                            }
                          >
                            {getStatusOpcoesPorNatureza(formInline.natureza).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="table-inline-actions">
                            <button className="btn small" onClick={salvarEdicaoInline}>
                              Salvar
                            </button>
                            <button
                              className="btn small secondary"
                              onClick={cancelarEdicaoInline}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={x.id}>
                    <tr
                      className={rowClass}
                      onClick={() => selecionarLinha(x)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{formatarData(x.competencia)}</td>
                      <td>{formatarData(x.dataLcto)}</td>
                      <td>
                        <span className="tag">{x.natureza}</span>
                      </td>
                      <td>{x.grupo}</td>
                      <td>{x.categoria}</td>
                      <td>{x.subcategoria}</td>
                      <td>{x.responsavel}</td>
                      <td className="valor">{moeda(Math.abs(x.valor))}</td>
                      <td>{x.status}</td>
                      <td>
                        <div className="table-inline-actions">
                          <button
                            className="btn small secondary"
                            onClick={(e) => iniciarEdicaoInline(x, e)}
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            className="btn small duplicate"
                            onClick={(e) => iniciarDuplicacao(x, e)}
                            title="Duplicar este lançamento para criar uma cópia e alterar variáveis"
                          >
                            Duplicar
                          </button>
                          <button
                            className="btn small danger"
                            onClick={(e) => abrirConfirmacaoExclusao(x.id, e)}
                            title="Excluir"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isDuplicatingThis && (
                      <tr key={`duplicando-${x.id}`} className="linha-em-edicao linha-duplicando">
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                              ✨ Cópia
                            </span>
                            <input
                              type="date"
                              className="table-edit-input"
                              value={formDuplicar.competencia || ''}
                              onChange={(e) =>
                                setFormDuplicar({ ...formDuplicar, competencia: e.target.value })
                              }
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="table-edit-input"
                            value={formDuplicar.dataLcto || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormDuplicar((prev) => ({
                                ...prev,
                                dataLcto: val,
                                competencia: (!prev.competencia || prev.competencia === prev.dataLcto) ? val : prev.competencia,
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="table-edit-input"
                            value={formDuplicar.natureza || 'Despesa'}
                            onChange={(e) => {
                              const novaNat = e.target.value;
                              setFormDuplicar((prev) => ({
                                ...prev,
                                natureza: novaNat,
                                status: ajustarStatusPorNatureza(novaNat, prev.status),
                              }));
                            }}
                          >
                            <option value="Receita">Receita</option>
                            <option value="Despesa">Despesa</option>
                            <option value="Custo">Custo</option>
                          </select>
                        </td>
                        <td>
                          <input
                            list="sugestaoGrupos"
                            className="table-edit-input"
                            value={formDuplicar.grupo || ''}
                            onChange={(e) =>
                              setFormDuplicar({ ...formDuplicar, grupo: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoCategorias"
                            className="table-edit-input"
                            value={formDuplicar.categoria || ''}
                            onChange={(e) =>
                              setFormDuplicar({ ...formDuplicar, categoria: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoSubcategorias"
                            className="table-edit-input"
                            value={formDuplicar.subcategoria || ''}
                            onChange={(e) =>
                              setFormDuplicar({ ...formDuplicar, subcategoria: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            list="sugestaoResponsaveis"
                            className="table-edit-input"
                            value={formDuplicar.responsavel || ''}
                            onChange={(e) =>
                              setFormDuplicar({ ...formDuplicar, responsavel: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="table-edit-input"
                            style={{ textAlign: 'right' }}
                            value={formDuplicar.valor ?? ''}
                            onChange={(e) =>
                              setFormDuplicar({
                                ...formDuplicar,
                                valor: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="table-edit-input"
                            value={formDuplicar.status || (formDuplicar.natureza === 'Receita' ? 'Recebido' : 'Pago')}
                            onChange={(e) =>
                              setFormDuplicar({ ...formDuplicar, status: e.target.value })
                            }
                          >
                            {getStatusOpcoesPorNatureza(formDuplicar.natureza).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="table-inline-actions">
                            <button
                              className="btn small success"
                              onClick={salvarDuplicacao}
                              title="Salvar novo lançamento duplicado"
                            >
                              Salvar Novo
                            </button>
                            <button
                              className="btn small secondary"
                              onClick={cancelarDuplicacao}
                              title="Cancelar duplicação"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards para Mobile */}
      <div className="mobile-lancamentos">
        {dados.map((x) => {
          const nat = normalizar(x.natureza);
          const isReceita = nat === 'receita';
          const isSelected = selecionadoId === x.id;

          let cardClass = 'mobile-card-lancamento';
          if (isReceita) cardClass += ' receita';
          else cardClass += ' saida';
          if (normalizar(x.subcategoria).includes('outros')) cardClass += ' outros';
          if (isSelected) cardClass += ' selecionado';

          return (
            <React.Fragment key={x.id}>
              <div
                className={cardClass}
                onClick={() => selecionarLinha(x)}
              >
              <div className="mobile-card-top">
                <div>
                  <div className="mobile-card-title">
                    {x.subcategoria || x.categoria || x.grupo}
                  </div>
                  <div className="mobile-card-date">
                    {formatarData(x.dataLcto)} | {x.natureza}
                  </div>
                </div>
                <div className="mobile-card-value">
                  {moeda(Math.abs(x.valor))}
                </div>
              </div>

              <div className="mobile-card-meta">
                <div>
                  <span>Grupo</span> {x.grupo || '-'}
                </div>
                <div>
                  <span>Categoria</span> {x.categoria || '-'}
                </div>
                <div>
                  <span>Responsável</span> {x.responsavel || '-'}
                </div>
                <div>
                  <span>Status</span> {x.status || '-'}
                </div>
              </div>

              <div className="mobile-card-actions">
                <button
                  className="btn small secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    iniciarEdicaoInline(x, e);
                  }}
                  title="Editar"
                >
                  Editar
                </button>
                <button
                  className="btn small duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    iniciarDuplicacao(x, e);
                  }}
                  title="Duplicar"
                >
                  Duplicar
                </button>
                <button
                  className="btn small danger"
                  onClick={(e) => abrirConfirmacaoExclusao(x.id, e)}
                  title="Excluir"
                >
                  Excluir
                </button>
              </div>
            </div>

            {duplicandoOrigemId === x.id && (
              <div
                className="mobile-card-lancamento duplicando-mobile"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✨ NOVO LANÇAMENTO (CÓPIA)</span>
                  <button className="btn small secondary" onClick={cancelarDuplicacao}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Competência</label>
                    <input
                      type="date"
                      className="table-edit-input"
                      value={formDuplicar.competencia || ''}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, competencia: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Data LCTO</label>
                    <input
                      type="date"
                      className="table-edit-input"
                      value={formDuplicar.dataLcto || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormDuplicar((prev) => ({
                          ...prev,
                          dataLcto: val,
                          competencia: (!prev.competencia || prev.competencia === prev.dataLcto) ? val : prev.competencia,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Natureza</label>
                    <select
                      className="table-edit-input"
                      value={formDuplicar.natureza || 'Despesa'}
                      onChange={(e) => {
                        const novaNat = e.target.value;
                        setFormDuplicar((prev) => ({
                          ...prev,
                          natureza: novaNat,
                          status: ajustarStatusPorNatureza(novaNat, prev.status),
                        }));
                      }}
                    >
                      <option value="Receita">Receita</option>
                      <option value="Despesa">Despesa</option>
                      <option value="Custo">Custo</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="table-edit-input"
                      value={formDuplicar.valor ?? ''}
                      onChange={(e) =>
                        setFormDuplicar({
                          ...formDuplicar,
                          valor: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Grupo</label>
                    <input
                      list="sugestaoGrupos"
                      className="table-edit-input"
                      value={formDuplicar.grupo || ''}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, grupo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Categoria</label>
                    <input
                      list="sugestaoCategorias"
                      className="table-edit-input"
                      value={formDuplicar.categoria || ''}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, categoria: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Subcategoria</label>
                    <input
                      list="sugestaoSubcategorias"
                      className="table-edit-input"
                      value={formDuplicar.subcategoria || ''}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, subcategoria: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Responsável</label>
                    <input
                      list="sugestaoResponsaveis"
                      className="table-edit-input"
                      value={formDuplicar.responsavel || ''}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, responsavel: e.target.value })}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Status</label>
                    <select
                      className="table-edit-input"
                      value={formDuplicar.status || (formDuplicar.natureza === 'Receita' ? 'Recebido' : 'Pago')}
                      onChange={(e) => setFormDuplicar({ ...formDuplicar, status: e.target.value })}
                    >
                      {getStatusOpcoesPorNatureza(formDuplicar.natureza).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn small success" onClick={salvarDuplicacao}>Salvar Novo</button>
                  <button className="btn small secondary" onClick={cancelarDuplicacao}>Cancelar</button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>

      {/* Modal de Confirmação de Exclusão Idêntico ao Original */}
      {confirmarExclusaoId && (
        <div className="confirm-overlay" onClick={() => setConfirmarExclusaoId(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Excluir lançamento?</div>
            <div className="confirm-text">
              Esta ação remove o registro do banco de dados. Confirme apenas se tiver certeza.
            </div>
            <div className="confirm-actions">
              <button className="btn small danger" onClick={confirmarExclusao}>
                Sim
              </button>
              <button className="btn small secondary" onClick={() => setConfirmarExclusaoId(null)}>
                Não
              </button>
              <button className="btn small secondary" onClick={() => setConfirmarExclusaoId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
