import Link from "next/link";
import { totalPages as computeTotalPages } from "@/lib/pagination";

export type ListPaginationSearchParams = Record<string, string | string[] | undefined>;

type Props = {
  pathname: string;
  searchParams: ListPaginationSearchParams;
  page: number;
  pageSize: number;
  total: number;
  /** Nombre del query param de página (p. ej. `ordersPage` en ficha cliente). */
  paramName?: string;
};

function appendParam(sp: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (value === undefined) return;
  if (Array.isArray(value)) {
    for (const v of value) sp.append(key, v);
  } else {
    sp.set(key, value);
  }
}

export function ListPagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
  paramName = "page"
}: Props) {
  const pages = computeTotalPages(total, pageSize);
  const current = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  function href(targetPage: number): string {
    const p = new URLSearchParams();
    for (const [key, val] of Object.entries(searchParams)) {
      if (key === paramName) continue;
      appendParam(p, key, val);
    }
    if (targetPage > 1) p.set(paramName, String(targetPage));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (total === 0) {
    return null;
  }

  return (
    <nav className="list-pagination" aria-label="Paginación">
      <p className="list-pagination__summary">
        Mostrando {from}–{to} de {total}
        {pages <= 1 ? (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>({pageSize} por página)</span>
        ) : null}
      </p>
      <div className="list-pagination__controls">
        {current > 1 ? (
          <Link className="button secondary button-compact" href={href(current - 1)} scroll={false}>
            Anterior
          </Link>
        ) : (
          <span className="button secondary button-compact list-pagination__disabled" aria-disabled="true">
            Anterior
          </span>
        )}
        <span className="list-pagination__page">
          Página {current} de {pages}
        </span>
        {current < pages ? (
          <Link className="button secondary button-compact" href={href(current + 1)} scroll={false}>
            Siguiente
          </Link>
        ) : (
          <span className="button secondary button-compact list-pagination__disabled" aria-disabled="true">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
