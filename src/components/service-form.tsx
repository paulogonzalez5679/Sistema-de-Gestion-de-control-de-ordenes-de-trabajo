"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Service } from "@/lib/types";

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: Service };

export function ServiceForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial ? String(initial.base_price) : "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initial ? String(initial.estimated_minutes) : "60"
  );
  const [isBundle, setIsBundle] = useState(initial?.is_bundle ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [rewardPoints, setRewardPoints] = useState(
    initial ? String(initial.reward_points ?? 0) : "0"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const rp = Math.max(0, Math.floor(Number(rewardPoints) || 0));
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        base_price: Number(basePrice) || 0,
        estimated_minutes: Number(estimatedMinutes) || 60,
        is_bundle: isBundle,
        is_active: isActive,
        reward_points: rp
      };
      if (!payload.name) throw new Error("El nombre es obligatorio.");

      if (props.mode === "create") {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo crear.");
        router.push("/dashboard/services");
        router.refresh();
      } else {
        const res = await fetch(`/api/services/${props.initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
        router.push("/dashboard/services");
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
    if (!window.confirm("¿Eliminar este servicio del catálogo?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${props.initial.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      router.push("/dashboard/services");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  return (
    <form className="svc-catalog-form card row" onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {props.mode === "create" ? "Nuevo servicio" : "Editar servicio"}
      </h3>

      <label>
        Nombre
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
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
          Precio base
          <input
            className="input"
            type="number"
            min={0}
            step={0.01}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />
        </label>
        <label>
          Duración estimada (min)
          <input
            className="input"
            type="number"
            min={1}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
          />
        </label>
      </div>

      <label>
        Puntos de recompensa
        <input
          className="input"
          type="number"
          min={0}
          step={1}
          value={rewardPoints}
          onChange={(e) => setRewardPoints(e.target.value)}
        />
        <span style={{ display: "block", marginTop: 6, fontSize: "0.82rem", color: "#b9accf" }}>
          Puntos que suma este servicio cuando la orden pasa a completada (junto con el resto de servicios de la
          orden). No aplica por reservar cita.
        </span>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={isBundle} onChange={(e) => setIsBundle(e.target.checked)} />
        Paquete / bundle
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activo en catálogo
      </label>

      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Guardando…" : props.mode === "create" ? "Crear servicio" : "Guardar cambios"}
        </button>
        <Link className="button secondary" href="/dashboard/services">
          Volver al catálogo
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
