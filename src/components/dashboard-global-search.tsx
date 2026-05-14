"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { DashboardSearchResponse } from "@/lib/dashboard-search-contract";
import { formatProfileRole } from "@/lib/ui-labels";

const DEBOUNCE_MS = 320;

export function DashboardGlobalSearch() {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardSearchResponse | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (debounced.length === 0) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard-search?q=${encodeURIComponent(debounced)}`);
        const json = (await res.json()) as DashboardSearchResponse & { error?: string };
        if (!res.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "No se pudo buscar.");
        }
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de búsqueda.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const totalHits =
    data === null
      ? 0
      : data.orders.length +
        data.clients.length +
        data.inventory.length +
        data.services.length +
        data.profiles.length;

  return (
    <div ref={wrapRef} className="admin-mission-search-wrap">
      <div className="admin-mission-search">
        <span className="material-symbols-outlined admin-mission-search-icon" aria-hidden>
          search
        </span>
        <input
          type="search"
          placeholder="Órdenes, clientes, inventario, servicios, usuarios…"
          aria-label="Buscar en todo el taller"
          aria-controls={listId}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />
      </div>
      {open && debounced.length > 0 ? (
        <div id={listId} className="admin-mission-search-panel" role="region" aria-label="Resultados de búsqueda">
          {loading ? (
            <p className="admin-mission-search-panel__status">Buscando…</p>
          ) : error ? (
            <p className="admin-mission-search-panel__error">{error}</p>
          ) : data && totalHits === 0 ? (
            <p className="admin-mission-search-panel__status">Sin resultados.</p>
          ) : data ? (
            <div className="admin-mission-search-panel__sections">
              {data.orders.length > 0 ? (
                <section className="admin-mission-search-section">
                  <h4 className="admin-mission-search-section__title">Órdenes</h4>
                  <ul className="admin-mission-search-section__list">
                    {data.orders.map((o) => (
                      <li key={o.id}>
                        <Link href={`/dashboard/orders/assigned/${o.id}`} className="admin-mission-search-hit">
                          <span className="admin-mission-search-hit__main">{o.order_number}</span>
                          <span className="admin-mission-search-hit__sub">{o.subtitle}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {data.clients.length > 0 ? (
                <section className="admin-mission-search-section">
                  <h4 className="admin-mission-search-section__title">Clientes</h4>
                  <ul className="admin-mission-search-section__list">
                    {data.clients.map((c) => (
                      <li key={c.id}>
                        <Link href={`/dashboard/clients/${c.id}`} className="admin-mission-search-hit">
                          <span className="admin-mission-search-hit__main">{c.full_name}</span>
                          {c.subtitle ? <span className="admin-mission-search-hit__sub">{c.subtitle}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {data.inventory.length > 0 ? (
                <section className="admin-mission-search-section">
                  <h4 className="admin-mission-search-section__title">Inventario (productos)</h4>
                  <ul className="admin-mission-search-section__list">
                    {data.inventory.map((it) => (
                      <li key={it.id}>
                        <Link href={`/dashboard/inventory/${it.id}/edit`} className="admin-mission-search-hit">
                          <span className="admin-mission-search-hit__main">{it.name}</span>
                          <span className="admin-mission-search-hit__sub">
                            SKU {it.sku}
                            {it.subtitle ? ` · ${it.subtitle}` : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {data.services.length > 0 ? (
                <section className="admin-mission-search-section">
                  <h4 className="admin-mission-search-section__title">Servicios (catálogo)</h4>
                  <ul className="admin-mission-search-section__list">
                    {data.services.map((s) => (
                      <li key={s.id}>
                        <Link href={`/dashboard/services/${s.id}/edit`} className="admin-mission-search-hit">
                          <span className="admin-mission-search-hit__main">{s.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {data.profiles.length > 0 ? (
                <section className="admin-mission-search-section">
                  <h4 className="admin-mission-search-section__title">Usuarios</h4>
                  <ul className="admin-mission-search-section__list">
                    {data.profiles.map((p) => (
                      <li key={p.id}>
                        <Link href={`/dashboard/users/${p.id}/edit`} className="admin-mission-search-hit">
                          <span className="admin-mission-search-hit__main">{p.full_name}</span>
                          <span className="admin-mission-search-hit__sub">{formatProfileRole(p.role)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
