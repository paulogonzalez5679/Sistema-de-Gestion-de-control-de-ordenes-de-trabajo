"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/lib/types";
import { ClientListPagination } from "@/components/client-list-pagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import { formatDateTime, formatNotificationSeverity } from "@/lib/ui-labels";

type NotificationsResponse = {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
};

export function NotificationsCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    const response = await fetch(`/api/notifications?${params.toString()}`);
    const data = (await response.json()) as NotificationsResponse;
    setItems(data.items ?? []);
    setTotal(typeof data.total === "number" ? data.total : 0);
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    let isMounted = true;
    load()
      .then(() => {
        if (!isMounted) return;
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No se pudieron cargar las notificaciones.");
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true })
    });
    await load();
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Alertas del sistema</h3>
      <input
        className="input"
        placeholder="Buscar por título o texto…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? <p>Cargando alertas…</p> : null}
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{item.title}</strong>
              <span className={`status ${item.severity}`}>{formatNotificationSeverity(item.severity)}</span>
            </div>
            <p>{item.body}</p>
            <small style={{ color: "#b9accf" }}>{formatDateTime(item.created_at)}</small>
            {!item.is_read ? (
              <div style={{ marginTop: 8 }}>
                <button className="button secondary" onClick={() => void markRead(item.id)}>
                  Marcar como leída
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <ClientListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} ariaLabel="Paginación de notificaciones" />
    </div>
  );
}
