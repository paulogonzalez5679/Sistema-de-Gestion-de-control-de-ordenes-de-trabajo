"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem } from "@/lib/types";

type InventoryFormProps = {
  mode: "create" | "edit";
  initialItem?: InventoryItem;
};

export function InventoryForm({ mode, initialItem }: InventoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialItem?.name ?? "");
  const [sku, setSku] = useState(initialItem?.sku ?? "");
  const [category, setCategory] = useState(initialItem?.category ?? "Químicos");
  const [supplier, setSupplier] = useState(initialItem?.supplier ?? "");
  const [unitCost, setUnitCost] = useState(String(initialItem?.unit_cost ?? 0));
  const [quantity, setQuantity] = useState(String(initialItem?.quantity ?? 0));
  const [reorderPoint, setReorderPoint] = useState(String(initialItem?.reorder_point ?? 0));
  const [notes, setNotes] = useState(initialItem?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        sku,
        category,
        supplier,
        unit_cost: Number(unitCost),
        quantity: Number(quantity),
        reorder_point: Number(reorderPoint),
        notes: notes || null
      };

      if (mode === "create") {
        const response = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "No se pudo crear el artículo.");
        }
      } else {
        const response = await fetch(`/api/inventory/${initialItem?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "No se pudo actualizar el artículo.");
        }
      }
      router.push("/dashboard/inventory");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error inesperado.");
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {mode === "create" ? "Nuevo artículo de inventario" : "Editar artículo"}
      </h3>
      <div className="row two">
        <label>
          Nombre del artículo
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          SKU
          <input className="input" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} required />
        </label>
        <label>
          Categoría
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} required />
        </label>
        <label>
          Proveedor
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
        </label>
        <label>
          Cantidad
          <input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label>
          Punto de reposición
          <input
            className="input"
            type="number"
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
            required
          />
        </label>
        <label>
          Coste unitario
          <input className="input" type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required />
        </label>
        <label>
          Notas
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      {error ? <p style={{ color: "#ff8f9c" }}>{error}</p> : null}
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Guardando…" : mode === "create" ? "Crear artículo" : "Guardar cambios"}
      </button>
    </form>
  );
}
