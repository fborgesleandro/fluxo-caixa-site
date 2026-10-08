'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import FilterBar, { FiltrosState, OpcoesFiltros } from '@/components/FilterBar';
import MetricCards from '@/components/MetricCards';
import CarouselPanel from '@/components/CarouselPanel';
import CashFlowChart, { LancamentoItem } from '@/components/CashFlowChart';
import StatusFlowChart from '@/components/StatusFlowChart';
import TreemapChart from '@/components/TreemapChart';
import UpcomingList from '@/components/UpcomingList';
import InvestmentsView, { InvestimentoItem } from '@/components/InvestmentsView';
import AnnualView from '@/components/AnnualView';
import TransactionsTable from '@/components/TransactionsTable';
import InvestmentModal from '@/components/InvestmentModal';
import ImportModal from '@/components/ImportModal';
import MirrorYearModal from '@/components/MirrorYearModal';
import DeleteYearModal from '@/components/DeleteYearModal';
import LoginScreen from '@/components/LoginScreen';

function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const FILTROS_INICIAIS: FiltrosState = {
  ano: [],
  mes: [],
  natureza: [],
  grupo: [],
  status: [],
  categoria: [],
  subcategoria: [],
  responsavel: [],
  dataInicio: '',
  dataFim: '',
  texto: '',
};

export default function Home() {
  const [usuario, setUsuario] = useState<{ nome: string; username: string } | null>(null);
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [carregando, setCarregando] = useState(false);

  // Dados do banco
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [investimentos, setInvestimentos] = useState<InvestimentoItem[]>([]);

  // Estado dos filtros
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAIS);

  // Carrossel de visualizações
  const [paginaCarrossel, setPaginaCarrossel] = useState(0);

  // Modais
  const [modalInvestAberto, setModalInvestAberto] = useState(false);
  const [modalImportAberto, setModalImportAberto] = useState(false);
  const [modalEspelharAberto, setModalEspelharAberto] = useState(false);
  const [modalExcluirAnoAberto, setModalExcluirAnoAberto] = useState(false);
  const [tipoImportModal, setTipoImportModal] = useState<'lancamentos' | 'investimentos'>('lancamentos');

  // Modo expandido do gráfico de linha
  const [modoGraficoExpandido, setModoGraficoExpandido] = useState(false);

  // Alternância do gráfico de linha: Evolução Geral vs Por Status
  const [abaGraficoLinha, setAbaGraficoLinha] = useState<'evolucao' | 'status'>('evolucao');

  // Tema Claro / Escuro (Padrão: escuro)
  const [tema, setTema] = useState<'dark' | 'light'>('dark');

  // Inicializar e sincronizar tema salvo
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('fcx_tema') as 'dark' | 'light' | null;
      const temaFinal = salvo === 'light' ? 'light' : 'dark';
      setTema(temaFinal);
      document.documentElement.setAttribute('data-theme', temaFinal);
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const alternarTema = () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    try {
      localStorage.setItem('fcx_tema', novoTema);
      document.documentElement.setAttribute('data-theme', novoTema);
    } catch {
      // Ignora erro se cookies/storage bloqueados
    }
  };

  // 1. Verificar sessão existente ao carregar
  useEffect(() => {
    async function checarSessao() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.autenticado) {
          setUsuario(data.usuario);
        }
      } catch {
        // Não autenticado
      } finally {
        setVerificandoAuth(false);
      }
    }
    checarSessao();
  }, []);

  // 2. Carregar dados do banco de dados
  const carregarDados = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    try {
      const [resLanc, resInvest] = await Promise.all([
        fetch('/api/lancamentos'),
        fetch('/api/investimentos'),
      ]);

      const dataLanc = await resLanc.json();
      const dataInvest = await resInvest.json();

      if (resLanc.ok && dataLanc.registros) {
        setLancamentos(dataLanc.registros);
      }

      if (resInvest.ok && dataInvest.registros) {
        setInvestimentos(dataInvest.registros);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      carregarDados();
    }
  }, [usuario, carregarDados]);

  // 3. Recalcular opções dinâmicas em cascata (Hierarquia Real do Original com suporte a múltipla seleção)
  const opcoesCascata = useMemo<OpcoesFiltros>(() => {
    const anos = Array.from(new Set(lancamentos.map((x) => x.ano).filter(Boolean) as number[]))
      .sort((a, b) => b - a);

    const baseParaMes = lancamentos.filter(
      (x) => !filtros.ano.includes('__NONE__') && (filtros.ano.length === 0 || filtros.ano.includes(String(x.ano)))
    );
    const mesesMap = new Map<number, string>();
    baseParaMes.forEach((x) => {
      if (x.mesNum) mesesMap.set(x.mesNum, x.mes || String(x.mesNum));
    });
    const meses = Array.from(mesesMap.entries())
      .map(([numero, nome]) => ({ numero, nome }))
      .sort((a, b) => a.numero - b.numero);

    const baseParaNat = baseParaMes.filter(
      (x) => !filtros.mes.includes('__NONE__') && (filtros.mes.length === 0 || filtros.mes.includes(String(x.mesNum)))
    );
    const naturezas = Array.from(new Set(baseParaNat.map((x) => x.natureza).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseParaGrp = baseParaNat.filter(
      (x) => !filtros.natureza.includes('__NONE__') && (filtros.natureza.length === 0 || filtros.natureza.includes(x.natureza))
    );
    const grupos = Array.from(new Set(baseParaGrp.map((x) => x.grupo).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseParaSt = baseParaGrp.filter(
      (x) => !filtros.grupo.includes('__NONE__') && (filtros.grupo.length === 0 || filtros.grupo.includes(x.grupo))
    );
    const status = Array.from(new Set(baseParaSt.map((x) => x.status).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseParaCat = baseParaSt.filter(
      (x) => !filtros.status.includes('__NONE__') && (filtros.status.length === 0 || filtros.status.includes(x.status))
    );
    const categorias = Array.from(new Set(baseParaCat.map((x) => x.categoria).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseParaSub = baseParaCat.filter(
      (x) => !filtros.categoria.includes('__NONE__') && (filtros.categoria.length === 0 || filtros.categoria.includes(x.categoria))
    );
    const subcategorias = Array.from(new Set(baseParaSub.map((x) => x.subcategoria).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseParaResp = baseParaSub.filter(
      (x) => !filtros.subcategoria.includes('__NONE__') && (filtros.subcategoria.length === 0 || filtros.subcategoria.includes(x.subcategoria))
    );
    const responsaveis = Array.from(new Set(baseParaResp.map((x) => x.responsavel).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      anos,
      meses,
      naturezas,
      grupos,
      status,
      categorias,
      subcategorias,
      responsaveis,
    };
  }, [
    lancamentos,
    filtros.ano,
    filtros.mes,
    filtros.natureza,
    filtros.grupo,
    filtros.status,
    filtros.categoria,
    filtros.subcategoria,
  ]);

  // 4. Alteração de filtro com recalculo em cascata e limpeza de filhos inválidos
  const onFiltroChange = (campo: keyof FiltrosState, valor: any) => {
    setFiltros((prev) => {
      const novos = { ...prev, [campo]: valor };

      // Se alterou ano ou mês, limpa intervalo de datas livres
      if (campo === 'ano' || campo === 'mes') {
        const temAno = Array.isArray(novos.ano) ? novos.ano.length > 0 : Boolean(novos.ano);
        const temMes = Array.isArray(novos.mes) ? novos.mes.length > 0 : Boolean(novos.mes);
        if (temAno || temMes) {
          novos.dataInicio = '';
          novos.dataFim = '';
        }
      }

      const HIERARQUIA: (keyof FiltrosState)[] = [
        'ano',
        'mes',
        'natureza',
        'grupo',
        'status',
        'categoria',
        'subcategoria',
        'responsavel',
      ];
      const idx = HIERARQUIA.indexOf(campo);

      if (idx !== -1) {
        // Filtrar base que satisfaz até o nível 'campo'
        let permitidos = lancamentos;
        if (novos.ano.length > 0) permitidos = permitidos.filter((x) => novos.ano.includes(String(x.ano)));
        if (novos.mes.length > 0) permitidos = permitidos.filter((x) => novos.mes.includes(String(x.mesNum)));
        if (novos.natureza.length > 0) permitidos = permitidos.filter((x) => novos.natureza.includes(x.natureza));
        if (novos.grupo.length > 0) permitidos = permitidos.filter((x) => novos.grupo.includes(x.grupo));
        if (novos.status.length > 0) permitidos = permitidos.filter((x) => novos.status.includes(x.status));
        if (novos.categoria.length > 0) permitidos = permitidos.filter((x) => novos.categoria.includes(x.categoria));
        if (novos.subcategoria.length > 0) permitidos = permitidos.filter((x) => novos.subcategoria.includes(x.subcategoria));

        // Se o valor de um campo posterior não existir mais no subconjunto, limpa os itens inválidos
        for (let i = idx + 1; i < HIERARQUIA.length; i++) {
          const c = HIERARQUIA[i];
          const valAtual = novos[c] as string[];
          if (Array.isArray(valAtual) && valAtual.length > 0) {
            let validos: string[] = [];
            if (c === 'mes') validos = valAtual.filter((v) => permitidos.some((x) => String(x.mesNum) === v));
            else if (c === 'natureza') validos = valAtual.filter((v) => permitidos.some((x) => x.natureza === v));
            else if (c === 'grupo') validos = valAtual.filter((v) => permitidos.some((x) => x.grupo === v));
            else if (c === 'status') validos = valAtual.filter((v) => permitidos.some((x) => x.status === v));
            else if (c === 'categoria') validos = valAtual.filter((v) => permitidos.some((x) => x.categoria === v));
            else if (c === 'subcategoria') validos = valAtual.filter((v) => permitidos.some((x) => x.subcategoria === v));
            else if (c === 'responsavel') validos = valAtual.filter((v) => permitidos.some((x) => x.responsavel === v));
            novos[c] = validos as any;
          }
        }
      }

      return novos;
    });
  };

  const onLimparCampo = (campo: keyof FiltrosState) => {
    if (campo === 'dataInicio' || campo === 'dataFim' || campo === 'texto') {
      onFiltroChange(campo, '');
    } else {
      onFiltroChange(campo, []);
    }
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
  };

  // 5. Filtragem dos lançamentos
  const dadosFiltrados = useMemo(() => {
    const textoBusca = normalizar(filtros.texto);

    return lancamentos.filter((x) => {
      const nat = x.natureza;
      const dataL = x.dataLcto || '';

      if (filtros.ano.includes('__NONE__') || (filtros.ano.length > 0 && !filtros.ano.includes(String(x.ano)))) return false;
      if (filtros.mes.includes('__NONE__') || (filtros.mes.length > 0 && !filtros.mes.includes(String(x.mesNum)))) return false;
      if (filtros.natureza.includes('__NONE__') || (filtros.natureza.length > 0 && !filtros.natureza.includes(nat))) return false;
      if (filtros.grupo.includes('__NONE__') || (filtros.grupo.length > 0 && !filtros.grupo.includes(x.grupo))) return false;
      if (filtros.status.includes('__NONE__') || (filtros.status.length > 0 && !filtros.status.includes(x.status))) return false;
      if (filtros.categoria.includes('__NONE__') || (filtros.categoria.length > 0 && !filtros.categoria.includes(x.categoria))) return false;
      if (filtros.subcategoria.includes('__NONE__') || (filtros.subcategoria.length > 0 && !filtros.subcategoria.includes(x.subcategoria))) return false;
      if (filtros.responsavel.includes('__NONE__') || (filtros.responsavel.length > 0 && !filtros.responsavel.includes(x.responsavel))) return false;

      if (filtros.dataInicio && dataL < filtros.dataInicio) return false;
      if (filtros.dataFim && dataL > filtros.dataFim) return false;

      if (textoBusca) {
        const linhaTexto = normalizar(
          `${x.competencia} ${x.dataLcto} ${x.natureza} ${x.grupo} ${x.categoria} ${x.subcategoria} ${x.responsavel} ${x.status} ${x.valor}`
        );
        if (!linhaTexto.includes(textoBusca)) return false;
      }

      return true;
    });
  }, [lancamentos, filtros]);

  // 6. Totais e métricas financeiras
  const { entradas, saidas, resultado, qtdeMeses, totalInvestimentos } = useMemo(() => {
    let ent = 0;
    let sai = 0;
    const mesesUnicos = new Set<string>();

    dadosFiltrados.forEach((x) => {
      const nat = normalizar(x.natureza);
      const val = Math.abs(x.valor);

      if (nat === 'receita') {
        ent += val;
      } else {
        sai += val;
      }

      const chaveMes = x.ano && x.mesNum ? `${x.ano}-${x.mesNum}` : x.dataLcto?.slice(0, 7);
      if (chaveMes) mesesUnicos.add(chaveMes);
    });

    const mapaInvest: Record<string, InvestimentoItem> = {};
    investimentos.forEach((inv) => {
      const k = `${inv.banco.toUpperCase()}_${inv.tipo.toLowerCase()}`;
      if (!mapaInvest[k] || inv.dataAtualizacao > mapaInvest[k].dataAtualizacao) {
        mapaInvest[k] = inv;
      }
    });

    const totInvest = Object.values(mapaInvest).reduce((acc, curr) => acc + curr.valor, 0);

    return {
      entradas: ent,
      saidas: sai,
      resultado: ent - sai,
      qtdeMeses: Math.max(mesesUnicos.size, 1),
      totalInvestimentos: totInvest,
    };
  }, [dadosFiltrados, investimentos]);

  // 7. Ações de CRUD Lançamentos
  const salvarLancamento = async (item: Partial<LancamentoItem>) => {
    try {
      const res = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await carregarDados();
      } else {
        alert('Erro ao salvar lançamento.');
      }
    } catch {
      alert('Erro de conexão ao salvar.');
    }
  };

  const excluirLancamento = async (id: string) => {
    try {
      const res = await fetch(`/api/lancamentos?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await carregarDados();
      } else {
        alert('Erro ao excluir lançamento.');
      }
    } catch {
      alert('Erro de conexão ao excluir.');
    }
  };

  // 8. Ações de CRUD Investimentos
  const salvarInvestimento = async (
    item: Partial<InvestimentoItem>,
    criarNovoHistorico: boolean = false
  ) => {
    try {
      const res = await fetch('/api/investimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, criarNovoHistorico }),
      });
      const data = await res.json();
      if (res.ok && data.registros) {
        setInvestimentos(data.registros);
      }
    } catch {
      alert('Erro ao atualizar investimento.');
    }
  };

  const excluirInvestimento = async (id: string) => {
    try {
      const res = await fetch(`/api/investimentos?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.registros) {
        setInvestimentos(data.registros);
      }
    } catch {
      alert('Erro ao excluir investimento.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUsuario(null);
  };

  // Carrossel
  const totalPaginasCarrossel = Math.max(2, 2 + Math.ceil(opcoesCascata.anos.length / 3));
  let rotuloCarrossel = 'Fluxo operacional';
  if (paginaCarrossel === 1) rotuloCarrossel = 'Investimentos & Patrimônio';
  else if (paginaCarrossel >= 2) rotuloCarrossel = 'Comparativo anual acumulado';

  const moverCarrossel = (direcao: number) => {
    setPaginaCarrossel((prev) => {
      const next = (prev + direcao + totalPaginasCarrossel) % totalPaginasCarrossel;
      return next;
    });
  };

  if (verificandoAuth) {
    return (
      <div className="login-screen">
        <div style={{ color: 'white', fontWeight: 600 }}>Carregando sistema...</div>
      </div>
    );
  }

  if (!usuario) {
    return <LoginScreen onLoginSucesso={(u) => setUsuario(u)} />;
  }

  return (
    <>
      {/* Seção Superior Congelada (Header + Filtros + Totais) */}
      <div className="sticky-top-zone">
        <Header
          usuarioNome={usuario.nome}
          totalRegistros={lancamentos.length}
          tema={tema}
          onAlternarTema={alternarTema}
          onLimparFiltros={limparFiltros}
          onAbrirEspelharAno={() => setModalEspelharAberto(true)}
          onAbrirExcluirAno={() => setModalExcluirAnoAberto(true)}
          onAbrirImportacao={() => {
            setTipoImportModal('lancamentos');
            setModalImportAberto(true);
          }}
          onLogout={handleLogout}
        />

        <div className="sticky-controls-container">
          {/* Barra de Filtros com Opções em Cascata Reais */}
          <FilterBar
            filtros={filtros}
            opcoes={opcoesCascata}
            onChange={onFiltroChange}
            onLimparCampo={onLimparCampo}
          />

          {/* Cards de Métricas */}
          <MetricCards
            entradas={entradas}
            saidas={saidas}
            resultado={resultado}
            totalInvestimentos={totalInvestimentos}
            qtdeMeses={qtdeMeses}
          />
        </div>
      </div>

      <div className="container content-container">
        {/* Painel do Carrossel */}
        <CarouselPanel
          paginaAtual={paginaCarrossel}
          totalPaginas={totalPaginasCarrossel}
          rotulo={rotuloCarrossel}
          onMover={moverCarrossel}
        />

        {/* Área Central: Alternada pelo Carrossel */}
        {paginaCarrossel === 0 && (
          <section
            className="charts"
            style={{
              gridTemplateColumns: modoGraficoExpandido ? '1fr' : undefined,
            }}
          >
            {abaGraficoLinha === 'evolucao' ? (
              <CashFlowChart
                dados={dadosFiltrados}
                expandido={modoGraficoExpandido}
                onToggleExpand={setModoGraficoExpandido}
                abaAtiva={abaGraficoLinha}
                onMudarAba={setAbaGraficoLinha}
              />
            ) : (
              <StatusFlowChart
                dados={dadosFiltrados}
                expandido={modoGraficoExpandido}
                onToggleExpand={setModoGraficoExpandido}
                abaAtiva={abaGraficoLinha}
                onMudarAba={setAbaGraficoLinha}
              />
            )}
            {!modoGraficoExpandido && (
              <>
                <TreemapChart
                  dados={dadosFiltrados}
                  subcategoriaSelecionada={filtros.subcategoria.length === 1 ? filtros.subcategoria[0] : ''}
                  onSelecionarSubcategoria={(sub) => onFiltroChange('subcategoria', [sub])}
                  onLimparFiltro={() => onLimparCampo('subcategoria')}
                />
                <UpcomingList dados={lancamentos} />
              </>
            )}
          </section>
        )}

        {paginaCarrossel === 1 && (
          <InvestmentsView
            investimentos={investimentos}
            onNovo={() => setModalInvestAberto(true)}
            onImportar={() => {
              setTipoImportModal('investimentos');
              setModalImportAberto(true);
            }}
            onSalvar={(item) => salvarInvestimento(item, false)}
            onExcluir={excluirInvestimento}
          />
        )}

        {paginaCarrossel >= 2 && (
          <AnnualView
            dados={lancamentos}
            anos={opcoesCascata.anos}
          />
        )}

        {/* Tabela de Lançamentos e Formulário */}
        <div style={{ marginTop: 20 }}>
          <TransactionsTable
            dados={dadosFiltrados}
            todosLancamentos={lancamentos}
            onSalvar={salvarLancamento}
            onExcluir={excluirLancamento}
            onRecarregar={carregarDados}
            textoFiltro={filtros.texto}
            onTextoFiltroChange={(txt) => onFiltroChange('texto', txt)}
            opcoesSugestoes={{
              grupos: opcoesCascata.grupos,
              categorias: opcoesCascata.categorias,
              subcategorias: opcoesCascata.subcategorias,
              responsaveis: opcoesCascata.responsaveis,
              status: opcoesCascata.status,
            }}
          />
        </div>
      </div>

      {/* Modal de Novo Investimento */}
      <InvestmentModal
        aberto={modalInvestAberto}
        onFechar={() => setModalInvestAberto(false)}
        onSalvar={salvarInvestimento}
      />

      {/* Modal de Importação do Google Sheets */}
      <ImportModal
        aberto={modalImportAberto}
        tipoInicial={tipoImportModal}
        onFechar={() => setModalImportAberto(false)}
        onSucesso={carregarDados}
      />

      {/* Modal de Espelhamento e Orçamento Anual */}
      <MirrorYearModal
        aberto={modalEspelharAberto}
        anosDisponiveis={opcoesCascata.anos}
        onFechar={() => setModalEspelharAberto(false)}
        onSucesso={carregarDados}
      />

      {/* Modal de Exclusão de Base Anual */}
      <DeleteYearModal
        aberto={modalExcluirAnoAberto}
        anosDisponiveis={opcoesCascata.anos}
        lancamentos={lancamentos}
        onFechar={() => setModalExcluirAnoAberto(false)}
        onSucesso={carregarDados}
      />
    </>
  );
}
