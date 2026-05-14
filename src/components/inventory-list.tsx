"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InventoryItem } from "@/lib/types";
import { ActionDropdown } from "@/components/action-dropdown";
import { ClientListPagination } from "@/components/client-list-pagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import {
  ALL_CATEGORIES_LABEL,
  formatStockState,
  getStockStateCode,
  stockStateToCssStatus
} from "@/lib/ui-labels";

type InventoryListResponse = {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function InventoryList() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "all") params.set("category", category);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const response = await fetch(`/api/inventory?${params.toString()}`);
    const data = (await response.json()) as InventoryListResponse;
    setItems(data.items ?? []);
    setTotal(typeof data.total === "number" ? data.total : 0);
    setLoading(false);
  }, [search, category, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    load()
      .then(() => {
        if (!isMounted) return;
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No se pudo cargar el inventario.");
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.category)))];
  }, [items]);

  return (
    <div className="row">
      <div className="card">
        <div className="row two inventory-filters">
          <label>
            Buscar en inventario
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU, artículo, proveedor…"
              enterKeyHint="search"
              autoComplete="off"
            />
          </label>
          <label>
            Categoría
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? ALL_CATEGORIES_LABEL : option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {loading ? <p className="app-muted-p">Cargando inventario…</p> : null}
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
      <div className="card inventory-list-card">
        <div className="inv-responsive-mobile">
          <ul className="inv-mobile-cards">
            {items.map((item) => {
              const code = getStockStateCode(item);
              const cssStatus = stockStateToCssStatus(code);
              return (
                <li key={item.id} className="inv-mobile-card card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <p className="inv-mobile-card__title">{item.name}</p>
                      <p className="inv-mobile-card__sku">{item.sku}</p>
                    </div>
                    <ActionDropdown ariaLabel={`Acciones de ${item.name}`}>
                      <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/inventory/${item.id}/edit`}>
                        Editar artículo
                      </Link>
                    </ActionDropdown>
                  </div>
                  <div className="inv-mobile-card__grid">
                    <span>Categoría: {item.category}</span>
                    <span>Cantidad: {item.quantity}</span>
                    <span>Reposición: {item.reorder_point}</span>
                    <span>Coste: ${Number(item.unit_cost).toFixed(2)}</span>
                  </div>
                  <span className={`status ${cssStatus}`} style={{ marginTop: 10, display: "inline-block" }}>
                    {formatStockState(code)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="inv-responsive-desktop inv-table-scroll">
          <table className="inv-data-table">
            <thead>
              <tr>
                <th>Artículo / SKU</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Reposición</th>
                <th>Coste unitario</th>
                <th>Estado</th>
                <th className="inv-data-table__actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const code = getStockStateCode(item);
                const cssStatus = stockStateToCssStatus(code);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div style={{ color: "#b9accf", fontSize: 12 }}>{item.sku}</div>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>{item.reorder_point}</td>
                    <td>${Number(item.unit_cost).toFixed(2)}</td>
                    <td>
                      <span className={`status ${cssStatus}`}>{formatStockState(code)}</span>
                    </td>
                    <td className="inv-data-table__actions">
                      <ActionDropdown ariaLabel={`Acciones de ${item.name}`}>
                        <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/inventory/${item.id}/edit`}>
                          Editar
                        </Link>
                      </ActionDropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ClientListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} ariaLabel="Paginación de inventario" />
      </div>
    </div>
  );
}
