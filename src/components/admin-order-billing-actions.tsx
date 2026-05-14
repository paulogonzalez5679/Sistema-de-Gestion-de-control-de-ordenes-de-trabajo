"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canManageOrderBilling } from "@/lib/roles";
import type { ProfileRole, WorkOrderStatus } from "@/lib/types";

export function AdminOrderBillingActions({
  orderId,
  status,
  userRole,
  variant = "default"
}: {
  orderId: string;
  status: WorkOrderStatus;
  userRole: ProfileRole | null;
  /** `menu`: filas para usar dentro de `ActionDropdown` (sin márgenes externos). */
  variant?: "default" | "menu";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showInvoice = canManageOrderBilling(userRole) && status === "pending_invoice";
  const showCancel =
    canManageOrderBilling(userRole) && (status === "draft" || status === "assigned");

  if (!showInvoice && !showCancel) {
    return null;
  }

  async function cancelOrder() {
    if (!window.confirm("¿Cancelar esta orden? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo cancelar la orden.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cancelar la orden.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "menu") {
    return (
      <>
        {showInvoice ? (
          <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/orders/${orderId}/invoice`}>
            Revisar y facturar
          </Link>
        ) : null}
        {showCancel ? (
          <button
            type="button"
            className="action-dropdown__item"
            role="menuitem"
            disabled={loading}
            onClick={() => void cancelOrder()}
          >
            {loading ? "Cancelando…" : "Cancelar orden"}
          </button>
        ) : null}
        {error ? (
          <p className="action-dropdown__error" role="status">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {showInvoice ? (
          <Link className="button" href={`/dashboard/orders/${orderId}/invoice`}>
            Revisar y facturar
          </Link>
        ) : null}
        {showCancel ? (
          <button className="button secondary" disabled={loading} onClick={() => void cancelOrder()}>
            {loading ? "Cancelando…" : "Cancelar orden"}
          </button>
        ) : null}
      </div>
      {error ? <p style={{ color: "#ff8f9c", marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}
