"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { LoyaltyReward } from "@/lib/types";

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: LoyaltyReward };

export function RewardForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pointsRequired, setPointsRequired] = useState(
    initial ? String(initial.points_required) : "100"
  );
  const [sortOrder, setSortOrder] = useState(initial ? String(initial.sort_order) : "0");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const pr = Math.floor(Number(pointsRequired) || 0);
      if (pr < 1) throw new Error("Los puntos requeridos deben ser al menos 1.");

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        points_required: pr,
        sort_order: Math.floor(Number(sortOrder) || 0),
        is_active: isActive
      };
      if (!payload.title) throw new Error("El título es obligatorio.");

      if (props.mode === "create") {
        const res = await fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo crear.");
        router.push("/dashboard/rewards");
        router.refresh();
      } else {
        const res = await fetch(`/api/rewards/${props.initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
        router.push("/dashboard/rewards");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") return;
    if (!window.confirm("¿Eliminar esta recompensa del catálogo?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rewards/${props.initial.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      router.push("/dashboard/rewards");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="loyalty-form card row" onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {props.mode === "create" ? "Nueva recompensa" : "Editar recompensa"}
      </h3>

      <label>
        Título
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Descripción
        <textarea
          className="textarea"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="row two">
        <label>
          Puntos necesarios
          <input
            className="input"
            type="number"
            min={1}
            value={pointsRequired}
            onChange={(e) => setPointsRequired(e.target.value)}
          />
        </label>
        <label>
          Orden de lista
          <input
            className="input"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activa (visible en metas de clientes)
      </label>

      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Guardando…" : props.mode === "create" ? "Crear recompensa" : "Guardar cambios"}
        </button>
        <Link className="button secondary" href="/dashboard/rewards">
          Volver
        </Link>
        {props.mode === "edit" ? (
          <button type="button" className="button danger" disabled={loading} onClick={() => void onDelete()}>
            Eliminar
          </button>
        ) : null}
      </div>
    </form>
  );
}
