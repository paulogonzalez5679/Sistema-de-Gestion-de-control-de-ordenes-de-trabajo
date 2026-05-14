"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineSpinner } from "@/components/inline-spinner";

export function AuditPurgeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function purge() {
    if (
      !window.confirm(
        "¿Vaciar por completo la tabla de auditoría en la base de datos? Esta acción no se puede deshacer. " +
          "Descarga antes el PDF si necesitas conservar el historial."
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/audit/purge", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "No se pudo vaciar la auditoría.");
      }
      setMessage(`Se eliminaron ${data.deleted_rows ?? 0} registro(s).`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al purgar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" className="button danger" disabled={loading} onClick={() => void purge()}>
        <span className="btn-loading-inner">
          {loading ? <InlineSpinner size="sm" /> : null}
          {loading ? "Vaciando…" : "Vaciar auditoría en base de datos"}
        </span>
      </button>
      {message ? <p style={{ color: "#b9accf", fontSize: "0.88rem", marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
