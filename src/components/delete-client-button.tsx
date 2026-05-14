"use client";

import { InlineSpinner } from "@/components/inline-spinner";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteClientButtonProps = {
  clientId: string;
  clientName: string;
  /** Tras borrar, navega aquí (p. ej. `/dashboard/clients` en la ficha). */
  redirectTo?: string;
};

export function DeleteClientButton({
  clientId,
  clientName,
  redirectTo,
  variant = "default"
}: DeleteClientButtonProps & { variant?: "default" | "menu" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `¿Eliminar al cliente "${clientName}"? Esta acción no se puede deshacer.\n\nSi tiene órdenes de trabajo, tendrás que gestionarlas antes de poder borrarlo.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo eliminar el cliente.");

      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        className="action-dropdown__item action-dropdown__item--danger"
        role="menuitem"
        disabled={loading}
        onClick={() => void handleDelete()}
      >
        <span className="btn-loading-inner">
          {loading ? <InlineSpinner size="sm" /> : null}
          {loading ? "Eliminando…" : "Eliminar cliente"}
        </span>
      </button>
    );
  }

  return (
    <button type="button" className="button danger" disabled={loading} onClick={handleDelete}>
      <span className="btn-loading-inner">
        {loading ? <InlineSpinner size="sm" /> : null}
        {loading ? "Eliminando…" : "Eliminar cliente"}
      </span>
    </button>
  );
}
