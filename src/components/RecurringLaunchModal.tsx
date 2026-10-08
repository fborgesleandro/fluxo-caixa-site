'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, CalendarSync, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import SearchableCombobox from './SearchableCombobox';
import { calcularDatasRecorrencia, formatarDataBr, gerarPreviaRecorrencia } from '@/lib/recorrencia';

export interface LancamentoReferencia {
  natureza: string;
  grupo: string;
  categoria: string;
  subcategoria: string;
  responsavel: string;
}

interface RecurringLaunchModalProps {
  aberto: boolean;
  lancamentosExistentes: LancamentoReferencia[];
  onFechar: () => void;
  onSucesso: () => void;
}

function moeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function RecurringLaunchModal({
  aberto,
  lancamentosExistentes,
  onFechar,
  onSucesso,
}: RecurringLaunchModalProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [natureza, setNatureza] = useState('Despesa');
  const [grupo, setGrupo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [valor, setValor] = useState<string>('');
  const [observacao, setObservacao] = useState('');

  const [mostrarDatasDetalhadas, setMostrarDatasDetalhadas] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Inicializar datas padrão ao abrir (mês atual até 6 meses à frente)
  useEffect(() => {
    if (aberto) {
      const hoje = new Date();
      const hojeIso = hoje.toISOString().slice(0, 10);
      const futuro = new Date();
      futuro.setMonth(futuro.getMonth() + 5);
      const futuroIso = futuro.toISOString().slice(0, 10);

      setDataInicio(hojeIso);
      setDataFim(futuroIso);
      setNatureza('Despesa');
      setGrupo('');
      setCategoria('');
      setSubcategoria('');
      setResponsavel('');
      setValor('');
      setObservacao('');
      setConfirmando(false);
      setSalvando(false);
      setErro(null);
      setMostrarDatasDetalhadas(false);
    }
  }, [aberto]);

  // --- Sugestões com Contexto Hierárquico ---
  const sugestoes = useMemo(() => {
    // 1. Grupos sugeridos: prioriza os vinculados à Natureza selecionada
    const gruposDaNatureza = Array.from(
      new Set(
        lancamentosExistentes
          .filter((x) => x.natureza?.toLowerCase() === natureza.toLowerCase())
          .map((x) => x.grupo)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const outrosGrupos = Array.from(
      new Set(lancamentosExistentes.map((x) => x.grupo).filter(Boolean))
    )
      .filter((g) => !gruposDaNatureza.includes(g))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const grupos = [...gruposDaNatureza, ...outrosGrupos];

    // 2. Categorias sugeridas: prioriza as vinculadas ao Grupo selecionado
    const categoriasDoGrupo = Array.from(
      new Set(
        lancamentosExistentes
          .filter((x) => {
            if (!grupo) return true;
            return x.grupo?.toLowerCase() === grupo.toLowerCase();
          })
          .map((x) => x.categoria)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const outrasCategorias = Array.from(
      new Set(lancamentosExistentes.map((x) => x.categoria).filter(Boolean))
    )
      .filter((c) => !categoriasDoGrupo.includes(c))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const categorias = grupo ? categoriasDoGrupo : [...categoriasDoGrupo, ...outrasCategorias];

    // 3. Subcategorias sugeridas: prioriza as vinculadas à Categoria selecionada
    const subcategoriasDaCategoria = Array.from(
      new Set(
        lancamentosExistentes
          .filter((x) => {
            if (!categoria) return true;
            return x.categoria?.toLowerCase() === categoria.toLowerCase();
          })
          .map((x) => x.subcategoria)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const outrasSubcategorias = Array.from(
      new Set(lancamentosExistentes.map((x) => x.subcategoria).filter(Boolean))
    )
      .filter((s) => !subcategoriasDaCategoria.includes(s))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const subcategorias = categoria
      ? subcategoriasDaCategoria
      : [...subcategoriasDaCategoria, ...outrasSubcategorias];

    // 4. Responsáveis
    const responsaveis = Array.from(
      new Set(lancamentosExistentes.map((x) => x.responsavel).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return { grupos, categorias, subcategorias, responsaveis };
  }, [lancamentosExistentes, natureza, grupo, categoria]);

  // --- Prévia da Recorrência ---
  const previa = useMemo(() => {
    if (!dataInicio || !dataFim) return null;
    const valorNum = Number(valor) || 0;
    return gerarPreviaRecorrencia(dataInicio, dataFim, valorNum, natureza);
  }, [dataInicio, dataFim, valor, natureza]);

  if (!aberto) return null;

  const validarCampos = (): string | null => {
    if (!dataInicio || !dataFim) return 'Informe a Data Inicial e a Data Final.';
    if (dataInicio > dataFim) return 'A Data Inicial não pode ser posterior à Data Final.';
    if (!previa || previa.quantidade === 0) return 'O período informado não gera nenhum lançamento.';
    if (!grupo.trim()) return 'Selecione ou informe um Grupo.';
    if (!categoria.trim()) return 'Selecione ou informe uma Categoria.';
    if (!subcategoria.trim()) return 'Selecione ou informe uma Subcategoria.';
    if (!responsavel.trim()) return 'Selecione ou informe um Responsável.';
    const valNum = Number(valor);
    if (isNaN(valNum) || valNum <= 0) return 'Informe um valor numérico positivo.';
    return null;
  };

  const handleAvancarParaConfirmacao = () => {
    const msgErro = validarCampos();
    if (msgErro) {
      setErro(msgErro);
      return;
    }
    setErro(null);
    setConfirmando(true);
  };

  const handleSalvarDefinitivo = async () => {
    const msgErro = validarCampos();
    if (msgErro) {
      setErro(msgErro);
      setConfirmando(false);
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch('/api/lancamentos/recorrente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          natureza,
          grupo: grupo.trim(),
          categoria: categoria.trim(),
          subcategoria: subcategoria.trim(),
          responsavel: responsavel.trim(),
          valor: Number(valor),
          observacao: observacao.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.sucesso) {
        throw new Error(data.erro || 'Falha ao gravar lançamentos recorrentes.');
      }

      onSucesso();
      onFechar();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao comunicar com o servidor.');
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div
        className="modal"
        style={{ maxWidth: '640px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarSync size={20} />
            </div>
            <div>
              <div className="section-title" style={{ marginBottom: 2 }}>
                Lançamento Recorrente
              </div>
              <div className="section-subtitle" style={{ marginBottom: 0 }}>
                Geração automática mensal de parcelas com controle de datas válidas
              </div>
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar} disabled={salvando}>
            <X size={14} />
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {erro && (
          <div
            style={{
              margin: '12px 16px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{erro}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          {!confirmando ? (
            <>
              {/* Linha 1: Período de Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Data Inicial</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Data Final</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Linha 2: Natureza e Valor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Natureza</label>
                  <select
                    value={natureza}
                    onChange={(e) => {
                      setNatureza(e.target.value);
                      // Limpar campos dependentes para reorientar o contexto
                      setGrupo('');
                      setCategoria('');
                      setSubcategoria('');
                    }}
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                    <option value="Custo">Custo</option>
                  </select>
                </div>
                <div>
                  <label>Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Linha 3: Grupo e Categoria (com Autocomplete Contextual) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SearchableCombobox
                  label="Grupo"
                  value={grupo}
                  onChange={(val) => {
                    setGrupo(val);
                    setCategoria('');
                    setSubcategoria('');
                  }}
                  options={sugestoes.grupos}
                  placeholder="Selecione ou digite o grupo..."
                  required
                />
                <SearchableCombobox
                  label="Categoria"
                  value={categoria}
                  onChange={(val) => {
                    setCategoria(val);
                    setSubcategoria('');
                  }}
                  options={sugestoes.categorias}
                  placeholder="Selecione ou digite a categoria..."
                  required
                />
              </div>

              {/* Linha 4: Subcategoria e Responsável */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SearchableCombobox
                  label="Subcategoria"
                  value={subcategoria}
                  onChange={setSubcategoria}
                  options={sugestoes.subcategorias}
                  placeholder="Selecione ou digite a subcategoria..."
                  required
                />
                <SearchableCombobox
                  label="Responsável"
                  value={responsavel}
                  onChange={setResponsavel}
                  options={sugestoes.responsaveis}
                  placeholder="Ex: Leandro, Jipsya..."
                  required
                />
              </div>

              {/* Linha 5: Observação Opcional */}
              <div>
                <label>Observação (Opcional)</label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Mensalidade, Assinatura anual parcelada..."
                />
              </div>

              {/* Caixa de Resumo em Tempo Real */}
              {previa && previa.quantidade > 0 && (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent, #38bdf8)' }}>
                      📋 Resumo do Período: {previa.quantidade} {previa.quantidade === 1 ? 'lançamento' : 'lançamentos'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarDatasDetalhadas(!mostrarDatasDetalhadas)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: 'var(--text-muted, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {mostrarDatasDetalhadas ? 'Ocultar datas' : 'Ver datas'}
                      {mostrarDatasDetalhadas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '8px',
                      marginTop: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Período: </span>
                      <strong style={{ color: '#f8fafc' }}>
                        {formatarDataBr(previa.dataInicio)} até {formatarDataBr(previa.dataFim)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Valor unitário: </span>
                      <strong style={{ color: '#f8fafc' }}>{moeda(previa.valorUnitario)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Valor total: </span>
                      <strong style={{ color: naturezasColor(natureza) }}>
                        {natureza.toLowerCase() === 'receita' ? '+' : '-'} {moeda(previa.valorTotal)}
                      </strong>
                    </div>
                  </div>

                  {/* Lista de Datas Detalhadas com Status Individual */}
                  {mostrarDatasDetalhadas && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        maxHeight: '130px',
                        overflowY: 'auto',
                      }}
                    >
                      {previa.parcelas.map((parc, idx) => {
                        const isRealizado = parc.status === 'Pago' || parc.status === 'Recebido';
                        return (
                          <span
                            key={parc.data}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{idx + 1}ª: {parc.dataBr}</span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: isRealizado ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                color: isRealizado ? '#4ade80' : '#facc15',
                              }}
                            >
                              {parc.status}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Tela de Confirmação Prévia Antes de Gravar */
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>Confirmar criação de {previa?.quantidade} lançamentos recorrentes</span>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div>
                  <strong>Natureza:</strong> <span className="tag">{natureza}</span>
                </div>
                <div>
                  <strong>Classificação:</strong> {grupo} &gt; {categoria} &gt; {subcategoria}
                </div>
                <div>
                  <strong>Responsável:</strong> {responsavel}
                </div>
                <div>
                  <strong>Período:</strong> {formatarDataBr(dataInicio)} até {formatarDataBr(dataFim)}
                </div>
                <div>
                  <strong>Valor unitário:</strong> {moeda(Number(valor))}
                </div>
                <div style={{ fontSize: '15px', marginTop: '4px' }}>
                  <strong>Valor Total da Recorrência:</strong>{' '}
                  <span style={{ fontWeight: 700, color: naturezasColor(natureza) }}>
                    {moeda((previa?.quantidade || 0) * (Number(valor) || 0))}
                  </span>
                </div>
                {(() => {
                  const pagosOuRecebidos = (previa?.parcelas || []).filter(
                    (p) => p.status === 'Pago' || p.status === 'Recebido'
                  ).length;
                  const aPagarOuReceber = (previa?.parcelas || []).filter(
                    (p) => p.status === 'À Pagar' || p.status === 'À Receber'
                  ).length;
                  const stPassado = natureza.toLowerCase() === 'receita' ? 'Recebido' : 'Pago';
                  const stFuturo = natureza.toLowerCase() === 'receita' ? 'À Receber' : 'À Pagar';

                  return (
                    <div
                      style={{
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                        fontSize: '12px',
                      }}
                    >
                      <strong>Status automático por parcela: </strong>
                      {pagosOuRecebidos > 0 && (
                        <span style={{ color: '#4ade80' }}>
                          {pagosOuRecebidos}x {stPassado} (&lt; hoje){' '}
                        </span>
                      )}
                      {pagosOuRecebidos > 0 && aPagarOuReceber > 0 && ' • '}
                      {aPagarOuReceber > 0 && (
                        <span style={{ color: '#facc15' }}>
                          {aPagarOuReceber}x {stFuturo} (&gt;= hoje)
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                ℹ️ Todos os {previa?.quantidade} lançamentos serão criados de forma atômica no banco de dados com seus status individuais calculados por data.
                Se desejar alterar qualquer dado, clique em <strong>Voltar</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px' }}>
          {!confirmando ? (
            <>
              <button type="button" className="btn secondary" onClick={onFechar} disabled={salvando}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleAvancarParaConfirmacao}
                style={{ background: '#9333ea', borderColor: '#9333ea' }}
              >
                Revisar e Gerar Lançamentos
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setConfirmando(false)}
                disabled={salvando}
              >
                Voltar / Editar
              </button>
              <button
                type="button"
                className="btn success"
                onClick={handleSalvarDefinitivo}
                disabled={salvando}
              >
                {salvando ? 'Gravando...' : 'Confirmar e Gravar Definitivamente'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function naturezasColor(nat: string): string {
  const norm = String(nat || '').toLowerCase();
  if (norm === 'receita') return '#4ade80';
  return '#f87171';
}
