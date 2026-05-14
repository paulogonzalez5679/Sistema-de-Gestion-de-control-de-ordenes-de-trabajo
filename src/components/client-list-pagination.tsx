"use client";

import { totalPages as computeTotalPages } from "@/lib/pagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  /** Etiqueta accesible para el nav */
  ariaLabel?: string;
};

export function ClientListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  ariaLabel = "Paginación"
}: Props) {
  const pages = computeTotalPages(total, pageSize);
  const current = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  if (total === 0) {
    return null;
  }

  return (
    <nav className="list-pagination" aria-label={ariaLabel}>
      <p className="list-pagination__summary">
        Mostrando {from}–{to} de {total}
        {pages <= 1 ? (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>({pageSize} por página)</span>
        ) : null}
      </p>
      <div className="list-pagination__controls">
        <button
          type="button"
          className="button secondary button-compact"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Anterior
        </button>
        <span className="list-pagination__page">
          Página {current} de {pages}
        </span>
        <button
          type="button"
          className="button secondary button-compact"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
