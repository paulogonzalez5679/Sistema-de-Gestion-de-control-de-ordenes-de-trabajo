"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LoyaltyReward } from "@/lib/types";

export function CatalogRewardRedeemList({
  clientId,
  rewards,
  canRedeemToday
}: {
  clientId: string;
  rewards: LoyaltyReward[];
  canRedeemToday: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(rewardId: string) {
    if (!canRedeemToday) return;
    if (!window.confirm("¿Registrar el canje de esta recompensa? Solo puedes un canje por día.")) return;
    setLoadingId(rewardId);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/loyalty/redeem-catalog-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo canjear.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingId(null);
    }
  }

  if (rewards.length === 0) {
    return (
      <p style={{ color: "#b9accf", margin: 0 }}>
        No hay recompensas del catálogo disponibles con tu saldo actual (o ya las canjeaste todas).
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!canRedeemToday ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#ffb86c" }}>
          Ya canjeaste hoy (máximo uno al día entre catálogo y servicio gratis). Mañana podrás canjear de nuevo.
        </p>
      ) : null}
      {error ? <p style={{ color: "#ff8f9c", margin: 0 }}>{error}</p> : null}
      <ul className="loyalty-list">
        {rewards.map((r) => (
          <li key={r.id} className="loyalty-list-item loyalty-row-with-action">
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{r.title}</strong>
              <div className="loyalty-meta">
                Requiere {r.points_required} pts · tus puntos no se reducen al canjear esta bonificación
              </div>
              {r.description ? (
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "#cdc2da" }}>{r.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="button secondary"
              style={{ flexShrink: 0 }}
              disabled={!canRedeemToday || loadingId !== null}
              onClick={() => void redeem(r.id)}
            >
              {loadingId === r.id ? "…" : "Canjear"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
