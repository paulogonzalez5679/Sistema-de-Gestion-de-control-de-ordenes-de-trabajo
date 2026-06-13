"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderHistoryDetail, OrderHistoryEntry } from "@/modules/orders/order.service";
import { formatDateTime, formatOrderStatus, formatPriority } from "@/lib/ui-labels";
import { SideDrawer } from "@/components/side-drawer";

export type OrderHistoryDrawerState =
  | { mode: "closed" }
  | { mode: "day"; dayLabel: string; orders: OrderHistoryEntry[] }
  | { mode: "order"; orderId: string; dayLabel: string; orders: OrderHistoryEntry[] };

type Props = {
  state: OrderHistoryDrawerState;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
  onBackToDay: () => void;
};

export function OrderHistoryDrawer({ state, onClose, onOpenOrder, onBackToDay }: Props) {
  const [detail, setDetail] = useState<OrderHistoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = state.mode !== "closed";
  const orderId = state.mode === "order" ? state.orderId : null;

  useEffect(() => {
    if (!orderId) {
      setDetail(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setDetail(null);
    fetch(`/api/orders/${orderId}/history-detail`)
      .then((r) => {
        if (r.status === 404) throw new Error("notfound");
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error("err");
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setDetail(json as OrderHistoryDetail);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof Error && e.message === "forbidden") {
            setErr("No tienes permiso para ver esta orden.");
          } else if (e instanceof Error && e.message === "notfound") {
            setErr("Esta orden no existe o no está en el historial.");
          } else {
            setErr("No se pudo cargar el detalle de la orden.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const title =
    state.mode === "day"
      ? `Órdenes — ${state.dayLabel}`
      : state.mode === "order"
        ? detail?.order.order_number ?? "Detalle de orden"
        : "";

  const footer =
    state.mode === "order" && detail ? (
      <div className="app-drawer__actions">
        <button type="button" className="button secondary" onClick={onBackToDay}>
          Volver al día
        </button>
        <Link className="button" href={`/dashboard/orders/assigned/${detail.order.id}`}>
          Ver orden completa
        </Link>
      </div>
    ) : null;

  return (
    <SideDrawer open={open} title={title} onClose={onClose} footer={footer}>
      {state.mode === "day" ? (
        <>
          <p className="app-drawer__muted" style={{ marginTop: 0 }}>
            {state.orders.length === 0
              ? "No hay órdenes por facturar o facturadas en este día."
              : `${state.orders.length} orden${state.orders.length === 1 ? "" : "es"} en este día.`}
          </p>
          <ul className="order-history-drawer__list">
            {state.orders.map((order) => (
              <li key={order.id}>
                <button type="button" className="order-history-drawer__item" onClick={() => onOpenOrder(order.id)}>
                  <span className="order-history-drawer__item-top">
                    <strong>{order.order_number}</strong>
                    <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                  </span>
                  <span className="order-history-drawer__item-sub">{order.client_name ?? "Cliente —"}</span>
                  <span className="order-history-drawer__item-meta">
                    {order.vehicle_label}
                    {order.assignee_name ? ` · ${order.assignee_name}` : ""}
                  </span>
                  <span className="order-history-drawer__item-total">
                    ${Number(order.total_amount).toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {state.mode === "order" ? (
        <>
          {loading ? <p className="app-drawer__muted">Cargando…</p> : null}
          {err ? <p className="app-drawer__error">{err}</p> : null}
          {detail && !loading ? (
            <>
              <div className="app-drawer__section">
                <p className="app-drawer__eyebrow">Orden</p>
                <p className="app-drawer__strong">{detail.order.order_number}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <span className={`status ${detail.order.status}`}>{formatOrderStatus(detail.order.status)}</span>
                  <span className="order-detail-priority">{formatPriority(detail.order.priority)}</span>
                </div>
              </div>

              <div className="app-drawer__section">
                <p className="app-drawer__eyebrow">Cliente</p>
                <p className="app-drawer__strong">{detail.client?.full_name ?? "—"}</p>
                {detail.client?.phone ? <p className="app-drawer__muted">{detail.client.phone}</p> : null}
              </div>

              <div className="app-drawer__section">
                <p className="app-drawer__eyebrow">Vehículo</p>
                <p className="app-drawer__strong">
                  {[detail.vehicle?.year, detail.vehicle?.make, detail.vehicle?.model].filter(Boolean).join(" ") ||
                    "—"}
                </p>
                {detail.vehicle?.plate ? (
                  <p className="app-drawer__muted">Matrícula {detail.vehicle.plate}</p>
                ) : null}
              </div>

              <div className="app-drawer__section">
                <p className="app-drawer__eyebrow">Equipo y fechas</p>
                <p className="app-drawer__muted">Asignado: {detail.assigneeName ?? "Sin asignar"}</p>
                {detail.order.completed_at ? (
                  <p className="app-drawer__muted">Finalizada: {formatDateTime(detail.order.completed_at)}</p>
                ) : null}
                <p className="app-drawer__muted">Actualizada: {formatDateTime(detail.order.updated_at)}</p>
              </div>

              <div className="app-drawer__section">
                <p className="app-drawer__eyebrow">Servicios</p>
                {detail.orderServices.length === 0 ? (
                  <p className="app-drawer__muted">Sin líneas cargadas.</p>
                ) : (
                  <ul className="app-drawer__list">
                    {detail.orderServices.map((line) => (
                      <li key={line.id}>
                        {line.service_name ?? `Servicio (${String(line.service_id).slice(0, 8)}…)`}
                        {"price" in line && line.price != null ? ` · $${Number(line.price).toFixed(2)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {detail.productLines.length > 0 ? (
                <div className="app-drawer__section">
                  <p className="app-drawer__eyebrow">Productos</p>
                  <ul className="app-drawer__list">
                    {detail.productLines.map((line) => (
                      <li key={line.id}>
                        {line.item_name} · {line.quantity} ud
                        {"unit_price" in line ? ` · $${Number(line.unit_price).toFixed(2)}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Number(detail.order.discount_amount ?? 0) > 0 ? (
                <p className="app-drawer__muted">
                  Descuento: <strong>${Number(detail.order.discount_amount).toFixed(2)}</strong>
                </p>
              ) : null}

              <p className="app-drawer__total">Total: ${Number(detail.order.total_amount).toFixed(2)}</p>
            </>
          ) : null}
        </>
      ) : null}
    </SideDrawer>
  );
}
