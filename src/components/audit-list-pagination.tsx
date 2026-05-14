"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ListPaginationSearchParams } from "@/components/list-pagination";
import { totalPages as computeTotalPages } from "@/lib/pagination";

type Props = {
  pathname: string;
  searchParams: ListPaginationSearchParams;
  page: number;
  pageSize: number;
  total: number;
  paramName?: string;
  /** Elemento al que hacer scroll al cambiar de página (inicio del listado). */
  scrollAnchorId: string;
};

function appendParam(sp: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (value === undefined) return;
  if (Array.isArray(value)) {
    for (const v of value) sp.append(key, v);
  } else {
    sp.set(key, value);
  }
}

export function AuditListPagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
  paramName = "page",
  scrollAnchorId
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

  function go(targetPage: number) {
    const url = href(targetPage);
    const el = typeof document !== "undefined" ? document.getElementById(scrollAnchorId) : null;
    el?.scrollIntoView({ behavior: "auto", block: "start" });
    startTransition(() => {
      router.push(url);
    });
  }

  if (total === 0) {
    return null;
  }

  return (
    <nav className="list-pagination" aria-label="Paginación">
      <p className="list-pagination__summary">
        Mostrando {from}–{to} de {total}
        {isPending ? (
          <span className="list-pagination__loading" style={{ marginLeft: 10 }}>
            Cargando…
          </span>
        ) : null}
        {pages <= 1 ? (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>({pageSize} por página)</span>
        ) : null}
      </p>
      <div className="list-pagination__controls">
        {current > 1 ? (
          <button type="button" className="button secondary button-compact" onClick={() => go(current - 1)}>
            Anterior
          </button>
        ) : (
          <span className="button secondary button-compact list-pagination__disabled" aria-disabled="true">
            Anterior
          </span>
        )}
        <span className="list-pagination__page">
          Página {current} de {pages}
        </span>
        {current < pages ? (
          <button type="button" className="button secondary button-compact" onClick={() => go(current + 1)}>
            Siguiente
          </button>
        ) : (
          <span className="button secondary button-compact list-pagination__disabled" aria-disabled="true">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
