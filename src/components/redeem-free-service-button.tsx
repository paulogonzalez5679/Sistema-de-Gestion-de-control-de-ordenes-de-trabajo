"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOYALTY_MAX_POINTS } from "@/lib/loyalty-constants";

export function RedeemFreeServiceButton({
  clientId,
  balance,
  canRedeemToday,
  disabledHint
}: {
  clientId: string;
  balance: number;
  /** False si ya hubo un canje hoy (catálogo o servicio gratis). */
  canRedeemToday: boolean;
  disabledHint?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEnoughPoints = balance >= LOYALTY_MAX_POINTS;
  const canRedeem = hasEnoughPoints && canRedeemToday;

  async function onRedeem() {
    if (!canRedeem) return;
    if (
      !window.confirm(
        "¿Registrar canje de servicio gratis? Los puntos pasarán a 0 (historial conservado)."
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/loyalty/redeem-free-service`, {
        method: "POST"
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo canjear.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!hasEnoughPoints ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#b9accf" }}>
          {disabledHint ??
            `Canje disponible al llegar a ${LOYALTY_MAX_POINTS} puntos (saldo actual: ${balance}).`}
        </p>
      ) : !canRedeemToday ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#ffb86c" }}>
          Ya usaste tu canje del día. Mañana podrás canjear el servicio gratis si sigues con {LOYALTY_MAX_POINTS}+ puntos.
        </p>
      ) : (
        <>
          <button type="button" className="button" disabled={loading} onClick={() => void onRedeem()}>
            {loading ? "Procesando…" : "Canjear servicio gratis (reiniciar puntos)"}
          </button>
          {error ? (
            <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "#ff8f9c" }}>{error}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
