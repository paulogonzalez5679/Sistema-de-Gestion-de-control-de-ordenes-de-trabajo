"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { canManageOrderBilling } from "@/lib/roles";
import type { ProfileRole } from "@/lib/types";

export function AdminDeleteOrderButton({
  orderId,
  orderNumber,
  userRole,
  variant = "default"
}: {
  orderId: string;
  orderNumber: string;
  userRole: ProfileRole | null;
  variant?: "default" | "menu";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManageOrderBilling(userRole)) {
    return null;
  }

  async function handleDelete() {
    const okConfirm = window.confirm(
      `¿Eliminar definitivamente la orden ${orderNumber}? Esta acción no se puede deshacer.`
    );
    if (!okConfirm) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo eliminar la orden.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la orden.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          className="action-dropdown__item action-dropdown__item--danger"
          role="menuitem"
          disabled={loading}
          onClick={handleDelete}
        >
          {loading ? "Eliminando…" : "Eliminar orden"}
        </button>
        {error ? (
          <p className="action-dropdown__error" role="status">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="button secondary"
        disabled={loading}
        onClick={handleDelete}
        style={{ borderColor: "rgba(255, 100, 120, 0.45)", color: "#ffb4bc" }}
      >
        {loading ? "Eliminando…" : "Eliminar orden"}
      </button>
      {error ? <p style={{ color: "#ff8f9c", marginTop: 6, fontSize: 12 }}>{error}</p> : null}
    </div>
  );
}
