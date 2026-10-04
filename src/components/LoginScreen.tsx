'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginScreenProps {
  onLoginSucesso: (usuario: { nome: string; username: string }) => void;
}

export default function LoginScreen({ onLoginSucesso }: LoginScreenProps) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await res.json();

      if (res.ok && data.autenticado) {
        onLoginSucesso(data.usuario);
      } else {
        setErro(data.mensagem || 'Usuário ou senha inválidos.');
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              background: 'rgba(30,53,58,0.1)',
              padding: 8,
              borderRadius: 10,
              color: 'var(--primary)',
            }}
          >
            <Lock size={22} />
          </div>
          <div>
            <div className="login-title">Fluxo de Caixa</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Acesso seguro &bull; Gestão Pessoal
            </div>
          </div>
        </div>

        <div className="login-subtitle">
          Entre com seu usuário e senha para visualizar os dados financeiros.
        </div>

        <form className="login-fields" onSubmit={handleSubmit}>
          <div>
            <label>Usuário</label>
            <input
              type="text"
              autoComplete="username"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ex: leandrob ou jipsyab"
              autoFocus
            />
          </div>

          <div>
            <label>Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
            />
          </div>

          <button
            className="btn"
            type="submit"
            disabled={carregando}
            style={{ width: '100%', height: 44, marginTop: 4 }}
          >
            {carregando ? 'Validando acesso...' : 'Entrar no Sistema'}
          </button>
        </form>

        {erro && <div className="login-error">{erro}</div>}
      </div>
    </div>
  );
}
