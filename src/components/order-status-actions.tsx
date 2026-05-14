"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isWorkOrderTerminalForOperator } from "@/lib/order-workflow";
import type { WorkOrderStatus } from "@/lib/types";

export function OrderStatusActions({
  orderId,
  currentStatus
}: {
  orderId: string;
  currentStatus: WorkOrderStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: WorkOrderStatus) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo actualizar el estado.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar el estado.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  if (isWorkOrderTerminalForOperator(currentStatus)) {
    return (
      <p style={{ color: "#b9accf", marginTop: 8 }}>
        {currentStatus === "pending_invoice"
          ? "La orden quedó por facturar. Un administrador debe marcarla como facturada."
          : currentStatus === "invoiced"
            ? "La orden está facturada."
            : "La orden está cancelada."}
      </p>
    );
  }

  const canStart = currentStatus === "assigned" || currentStatus === "draft";
  const canFinish = currentStatus === "in_progress" || currentStatus === "paused";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canStart ? (
          <button className="button" disabled={loading} onClick={() => updateStatus("in_progress")}>
            Iniciar ejecución
          </button>
        ) : null}
        {canFinish ? (
          <button className="button" disabled={loading} onClick={() => updateStatus("pending_invoice")}>
            Finalizar (por facturar)
          </button>
        ) : null}
      </div>
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
    </div>
  );
}
