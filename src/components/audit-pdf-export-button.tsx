"use client";

import { useState } from "react";
import { InlineSpinner } from "@/components/inline-spinner";

export function AuditPdfExportButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/audit/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.error === "string" ? err.error : "No se pudo generar el PDF.");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `auditoria-${Date.now()}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Descarga iniciada. Los datos en base no se modifican.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="button secondary" disabled={loading} onClick={() => void download()}>
        <span className="btn-loading-inner">
          {loading ? <InlineSpinner size="sm" /> : null}
          {loading ? "Generando PDF…" : "Descargar auditoría en PDF (sin borrar datos)"}
        </span>
      </button>
      {message ? <p style={{ color: "#b9accf", fontSize: "0.88rem", marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
