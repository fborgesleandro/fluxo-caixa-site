'use client';

import React from 'react';

interface MetricCardsProps {
  entradas: number;
  saidas: number;
  resultado: number;
  totalInvestimentos: number;
  qtdeMeses: number;
}

function formatarMoeda(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function MetricCards({
  entradas,
  saidas,
  resultado,
  totalInvestimentos,
  qtdeMeses,
}: MetricCardsProps) {
  const mesesValidos = Math.max(qtdeMeses, 1);
  const mediaEntradas = entradas / mesesValidos;
  const mediaSaidas = saidas / mesesValidos;
  const mediaResultado = resultado / mesesValidos;

  const corResultado =
    resultado > 0 ? 'var(--positive)' : resultado < 0 ? 'var(--negative)' : 'var(--text)';

  return (
    <section className="cards">
      <div className="card receita">
        <div className="card-title">Entradas</div>
        <div className="card-value" style={{ color: 'var(--positive)' }}>
          {formatarMoeda(entradas)}
        </div>
        <div className="card-footer">
          Média mensal: {formatarMoeda(mediaEntradas)}
        </div>
      </div>

      <div className="card despesa">
        <div className="card-title">Saídas</div>
        <div className="card-value" style={{ color: 'var(--negative)' }}>
          {formatarMoeda(saidas)}
        </div>
        <div className="card-footer">
          Média mensal: {formatarMoeda(mediaSaidas)}
        </div>
      </div>

      <div className="card resultado">
        <div className="card-title">Resultado</div>
        <div className="card-value" style={{ color: corResultado }}>
          {formatarMoeda(resultado)}
        </div>
        <div className="card-footer">
          Média mensal: {formatarMoeda(mediaResultado)}
        </div>
      </div>

      <div className="card investimento">
        <div className="card-title">Total Investimentos</div>
        <div className="card-value card-invest-total">
          {formatarMoeda(totalInvestimentos)}
        </div>
        <div className="card-footer">Posição atual</div>
      </div>
    </section>
  );
}
