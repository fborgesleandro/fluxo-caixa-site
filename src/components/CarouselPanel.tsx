'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselPanelProps {
  paginaAtual: number;
  totalPaginas: number;
  rotulo: string;
  onMover: (direcao: number) => void;
}

export default function CarouselPanel({
  paginaAtual,
  totalPaginas,
  rotulo,
  onMover,
}: CarouselPanelProps) {
  return (
    <section className="carousel-panel">
      <div>
        <div className="section-title" style={{ marginBottom: 2 }}>
          Visualização
        </div>
        <div className="section-subtitle" style={{ marginBottom: 0 }}>
          {rotulo}
        </div>
      </div>
      <div className="carousel-actions">
        <button
          className="carousel-btn"
          onClick={() => onMover(-1)}
          title="Visualização anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="carousel-year">
          {paginaAtual + 1} / {Math.max(totalPaginas, 1)}
        </span>
        <button
          className="carousel-btn"
          onClick={() => onMover(1)}
          title="Próxima visualização"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
