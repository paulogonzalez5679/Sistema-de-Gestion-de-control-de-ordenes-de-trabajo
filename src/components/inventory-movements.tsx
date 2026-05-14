"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { InventoryMovement } from "@/lib/types";
import { ClientListPagination } from "@/components/client-list-pagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import { formatDateTime, formatMovementType } from "@/lib/ui-labels";

type InventoryMovementsProps = {
  itemId: string;
};

type MovementsResponse = {
  items: InventoryMovement[];
  total: number;
  page: number;
  pageSize: number;
};

export function InventoryMovements({ itemId }: InventoryMovementsProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [movementType, setMovementType] = useState<"receive" | "issue" | "adjustment">("adjustment");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    const params = new URLSearchParams({ itemId, page: String(page), pageSize: String(pageSize) });
    const response = await fetch(`/api/inventory/movements?${params.toString()}`);
    const data = (await response.json()) as MovementsResponse;
    setMovements(data.items ?? []);
    setTotal(typeof data.total === "number" ? data.total : 0);
  }, [itemId, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    loadMovements()
      .then(() => {
        if (!isMounted) return;
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No se pudo cargar el historial de movimientos.");
      });
    return () => {
      isMounted = false;
    };
  }, [loadMovements]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        movement_type: movementType,
        quantity_delta: Number(quantityDelta),
        reason
      })
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "No se pudo guardar el movimiento.");
      setLoading(false);
      return;
    }
    setQuantityDelta("");
    setReason("");
    setPage(1);
    await loadMovements();
    setLoading(false);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Historial de movimientos</h3>
      <form onSubmit={onSubmit} className="row two" style={{ marginBottom: 12 }}>
        <label>
          Tipo de movimiento
          <select className="input" value={movementType} onChange={(e) => setMovementType(e.target.value as never)}>
            <option value="receive">Entrada</option>
            <option value="issue">Salida</option>
            <option value="adjustment">Ajuste</option>
          </select>
        </label>
        <label>
          Variación de cantidad
          <input
            className="input"
            type="number"
            value={quantityDelta}
            onChange={(e) => setQuantityDelta(e.target.value)}
            required
          />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Motivo
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Guardando…" : "Registrar movimiento"}
        </button>
      </form>
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Variación</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td>{formatDateTime(movement.created_at)}</td>
              <td>{formatMovementType(movement.movement_type)}</td>
              <td>{movement.quantity_delta > 0 ? `+${movement.quantity_delta}` : movement.quantity_delta}</td>
              <td>{movement.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ClientListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} ariaLabel="Paginación de movimientos" />
    </div>
  );
}
