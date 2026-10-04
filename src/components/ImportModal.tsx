'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ImportModalProps {
  aberto: boolean;
  tipoInicial?: 'lancamentos' | 'investimentos';
  onFechar: () => void;
  onSucesso: () => void;
}

export default function ImportModal({
  aberto,
  tipoInicial = 'lancamentos',
  onFechar,
  onSucesso,
}: ImportModalProps) {
  const [tipo, setTipo] = useState<'lancamentos' | 'investimentos'>(tipoInicial);
  const [csvContent, setCsvContent] = useState('');
  const [limparAntes, setLimparAntes] = useState(tipoInicial === 'investimentos');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  useEffect(() => {
    if (aberto) {
      setTipo(tipoInicial);
      setLimparAntes(tipoInicial === 'investimentos');
      setResultado(null);
      setCsvContent('');
    }
  }, [aberto, tipoInicial]);

  if (!aberto) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(file);
  };

  const executarImportacao = async () => {
    if (!csvContent.trim()) {
      alert('Selecione um arquivo CSV ou cole o conteúdo no campo de texto.');
      return;
    }

    setCarregando(true);
    setResultado(null);

    try {
      const res = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          csvContent,
          limparAntes,
        }),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        setResultado({ sucesso: true, mensagem: data.mensagem });
        setTimeout(() => {
          onSucesso();
          onFechar();
        }, 1500);
      } else {
        setResultado({
          sucesso: false,
          mensagem: data.erro || 'Erro ao processar dados do arquivo.',
        });
      }
    } catch (err: any) {
      setResultado({
        sucesso: false,
        mensagem: err.message || 'Falha na conexão com o servidor.',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal" style={{ width: 'min(660px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>
              {tipo === 'investimentos'
                ? 'Importar Tabela de Investimentos'
                : 'Importar Lançamentos do Fluxo de Caixa'}
            </div>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              {tipo === 'investimentos'
                ? 'Carregue os valores reais da aba Investimentos do Google Sheets'
                : 'Carregue os dados da aba Sheet1 do Google Sheets'}
            </div>
          </div>
          <button className="btn small secondary" onClick={onFechar}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <label>Qual tabela você está importando?</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'none', fontSize: 13 }}>
                <input
                  type="radio"
                  name="tipoImport"
                  checked={tipo === 'lancamentos'}
                  onChange={() => {
                    setTipo('lancamentos');
                    setLimparAntes(false);
                  }}
                />
                Lançamentos (Aba Sheet1)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'none', fontSize: 13 }}>
                <input
                  type="radio"
                  name="tipoImport"
                  checked={tipo === 'investimentos'}
                  onChange={() => {
                    setTipo('investimentos');
                    setLimparAntes(true);
                  }}
                />
                Investimentos & Patrimônio (Aba Investimentos)
              </label>
            </div>
          </div>

          <div style={{ background: 'var(--card-subtle)', border: '1px dashed var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
            <UploadCloud size={30} style={{ color: 'var(--primary)', margin: 'auto', marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              {tipo === 'investimentos' ? 'Arquivo CSV da Aba "Investimentos"' : 'Arquivo CSV da Aba "Sheet1"'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              No Google Sheets: selecione a aba &gt; Arquivo &gt; Fazer download &gt; Valores separados por vírgula (.csv)
            </div>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              style={{ fontSize: 12 }}
            />
          </div>

          <div>
            <label>Ou Cole Diretamente os Dados Copiados da Planilha (Ctrl+V)</label>
            <textarea
              rows={5}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={
                tipo === 'investimentos'
                  ? 'Exemplo:\nBanco\tTipo\tValor\tData Atualização\nNUBANK\tCaixinha\t25000\t2026-05-10\nPICPAY\tCDB\t15000\t2026-05-10'
                  : 'Cole as linhas copiadas da sua planilha...'
              }
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: 11,
                marginTop: 4,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="chkLimpar"
              checked={limparAntes}
              onChange={(e) => setLimparAntes(e.target.checked)}
              style={{ width: 'auto', height: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="chkLimpar" style={{ cursor: 'pointer', textTransform: 'none', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
              {tipo === 'investimentos'
                ? 'Substituir dados anteriores (apagar os valores de demonstração/atuais antes de gravar)'
                : 'Substituir dados anteriores (apagar lançamentos atuais antes de gravar)'}
            </label>
          </div>

          {resultado && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                background: resultado.sucesso ? 'var(--positive-bg)' : 'var(--negative-bg)',
                color: resultado.sucesso ? 'var(--positive)' : 'var(--negative)',
                border: `1px solid ${resultado.sucesso ? 'var(--positive)' : 'var(--negative)'}`,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{resultado.mensagem}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onFechar} disabled={carregando}>
            Cancelar
          </button>
          <button className="btn" onClick={executarImportacao} disabled={carregando}>
            <FileText size={14} />
            {carregando ? 'Gravando no banco de dados...' : 'Importar para o Banco de Dados'}
          </button>
        </div>
      </div>
    </div>
  );
}
