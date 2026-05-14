"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOYALTY_MAX_POINTS } from "@/lib/loyalty-constants";
import type { PendingRewardModalPayload } from "@/lib/types";

export function PendingRewardModal({
  clientId,
  payload,
  open,
  onClose,
  onRedeemed
}: {
  clientId: string;
  payload: PendingRewardModalPayload | null;
  open: boolean;
  onClose: () => void;
  onRedeemed?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !payload) return null;

  async function redeem() {
    if (!payload) return;
    setLoading(true);
    setError(null);
    try {
      if (payload.kind === "free_service") {
        const res = await fetch(`/api/clients/${clientId}/loyalty/redeem-free-service`, { method: "POST" });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo canjear.");
      } else {
        const res = await fetch(`/api/clients/${clientId}/loyalty/redeem-catalog-reward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rewardId: payload.reward.id })
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo canjear.");
      }
      onRedeemed?.();
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const p = payload;

  const title =
    p.kind === "free_service"
      ? "Servicio gratis disponible"
      : "Recompensa disponible por cobrar";

  const body =
    p.kind === "free_service" ? (
      <p style={{ margin: 0, color: "#cdc2da", lineHeight: 1.5 }}>
        Este cliente tiene <strong>{LOYALTY_MAX_POINTS} puntos</strong> y puede canjear el{" "}
        <strong>servicio gratis</strong> (el saldo pasará a 0). Solo se permite{" "}
        <strong>un canje por día</strong> en total (catálogo o servicio gratis).
      </p>
    ) : (
      <div style={{ color: "#cdc2da", lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 10px" }}>
          <strong>{p.reward.title}</strong>
        </p>
        {p.reward.description ? <p style={{ margin: "0 0 10px" }}>{p.reward.description}</p> : null}
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#b9accf" }}>
          Requiere {p.reward.points_required} puntos. Los puntos del cliente no se reducen; este canje cuenta como tu
          única acción del día si confirmas.
        </p>
      </div>
    );

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-reward-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pending-reward-title" style={{ marginTop: 0 }}>
          {title}
        </h2>
        {body}
        {error ? (
          <p style={{ color: "#ff8f9c", marginTop: 12, marginBottom: 0, fontSize: "0.9rem" }}>{error}</p>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <button type="button" className="button" disabled={loading} onClick={() => void redeem()}>
            {loading ? "Procesando…" : "Canjear"}
          </button>
          <button type="button" className="button secondary" disabled={loading} onClick={onClose}>
            Cancelar
          </button>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: "0.78rem", color: "#8a7aa3" }}>
          Este aviso volverá a aparecer al buscar la matrícula mientras siga habiendo una bonificación pendiente y no
          hayas alcanzado el límite diario de canjes.
        </p>
      </div>
    </div>
  );
}
