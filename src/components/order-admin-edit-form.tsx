"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { utcIsoToWallDatetimeLocal } from "@/lib/app-timezone";
import { formatOrderStatus, formatPriority, formatProfileRole } from "@/lib/ui-labels";
import type { Client, Vehicle, WorkOrder, WorkOrderPriority, WorkOrderStatus } from "@/lib/types";
import { ResponsiveSelect } from "@/components/responsive-select";

const STATUSES: WorkOrderStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "paused",
  "pending_invoice",
  "invoiced",
  "cancelled"
];

const PRIORITIES: WorkOrderPriority[] = ["low", "normal", "high", "urgent"];

type Assignee = { id: string; full_name: string; role: string };

function emptyToNull(isoLocal: string): string | null {
  const t = isoLocal.trim();
  return t.length ? t : null;
}

export function OrderAdminEditForm({ order: initial }: { order: WorkOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [status, setStatus] = useState<WorkOrderStatus>(initial.status);
  const [priority, setPriority] = useState<WorkOrderPriority>(initial.priority);
  const [assignedTo, setAssignedTo] = useState(initial.assigned_to ?? "");
  const [clientId, setClientId] = useState(initial.client_id);
  const [vehicleId, setVehicleId] = useState(initial.vehicle_id);
  const [scheduledStart, setScheduledStart] = useState(
    initial.scheduled_start ? utcIsoToWallDatetimeLocal(initial.scheduled_start) : ""
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    initial.scheduled_end ? utcIsoToWallDatetimeLocal(initial.scheduled_end) : ""
  );
  const [checkInAt, setCheckInAt] = useState(
    initial.check_in_at ? utcIsoToWallDatetimeLocal(initial.check_in_at) : ""
  );
  const [completedAt, setCompletedAt] = useState(
    initial.completed_at ? utcIsoToWallDatetimeLocal(initial.completed_at) : ""
  );
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, aRes] = await Promise.all([fetch("/api/clients"), fetch("/api/profiles/assignees")]);
        const cJson = cRes.ok ? await cRes.json() : [];
        const aJson = aRes.ok ? await aRes.json() : [];
        if (!cancelled) {
          setClients(Array.isArray(cJson) ? cJson : []);
          setAssignees(Array.isArray(aJson) ? aJson : []);
        }
      } catch {
        if (!cancelled) setBootError("No se pudieron cargar clientes o asignables.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadVehicles = useCallback(async (cid: string) => {
    if (!cid) {
      setVehicles([]);
      return;
    }
    try {
      const r = await fetch(`/api/vehicles?clientId=${encodeURIComponent(cid)}`);
      const j = r.ok ? await r.json() : [];
      setVehicles(Array.isArray(j) ? j : []);
    } catch {
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    void loadVehicles(clientId);
  }, [clientId, loadVehicles]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: `${c.full_name} · ${c.phone}` })),
    [clients]
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.plate} — ${v.make} ${v.model}`
      })),
    [vehicles]
  );

  const assigneeOptions = useMemo(
    () => assignees.map((p) => ({ value: p.id, label: `${p.full_name} (${formatProfileRole(p.role)})` })),
    [assignees]
  );

  const statusOptions = useMemo(
    () => STATUSES.map((s) => ({ value: s, label: formatOrderStatus(s) })),
    []
  );
  const priorityOptions = useMemo(
    () => PRIORITIES.map((p) => ({ value: p, label: formatPriority(p) })),
    []
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      status,
      priority,
      assigned_to: assignedTo.trim() ? assignedTo.trim() : null,
      client_id: clientId,
      vehicle_id: vehicleId,
      notes: notes.trim() || "—"
    };
    const s = emptyToNull(scheduledStart);
    const en = emptyToNull(scheduledEnd);
    if (s) body.scheduled_start = s;
    else body.scheduled_start = null;
    if (en) body.scheduled_end = en;
    else body.scheduled_end = null;
    const ci = emptyToNull(checkInAt);
    const co = emptyToNull(completedAt);
    body.check_in_at = ci;
    body.completed_at = co;

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo guardar la orden.");
      }
      setOrder(payload as WorkOrder);
      router.refresh();
      router.push(`/dashboard/orders/assigned/${order.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="row" onSubmit={onSubmit} style={{ maxWidth: 720 }}>
      <Link className="order-detail-back" href={`/dashboard/orders/assigned/${order.id}`}>
        ← Volver a la orden
      </Link>
      <h1 style={{ margin: "0 0 8px" }}>Editar orden {order.order_number}</h1>
      <p style={{ color: "#b9accf", marginTop: 0 }}>
        Solo administradores. Los cambios de programación sincronizan la cita del calendario si existe.
      </p>
      {bootError ? <p style={{ color: "#ff8f9c" }}>{bootError}</p> : null}

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <label>
          Estado
          <ResponsiveSelect
            value={status}
            onChange={(v) => setStatus((v || "assigned") as WorkOrderStatus)}
            options={statusOptions}
            placeholderOptionLabel="Estado"
            modalTitle="Estado de la orden"
            required
          />
        </label>
        <label>
          Prioridad
          <ResponsiveSelect
            value={priority}
            onChange={(v) => setPriority((v || "normal") as WorkOrderPriority)}
            options={priorityOptions}
            placeholderOptionLabel="Prioridad"
            modalTitle="Prioridad"
            required
          />
        </label>
        <label>
          Detallista asignado
          <ResponsiveSelect
            value={assignedTo}
            onChange={setAssignedTo}
            options={assigneeOptions}
            placeholderOptionLabel="Sin asignar"
            modalTitle="Asignado a"
            allowClear
            allowClearLabel="Sin asignar"
          />
        </label>
        <label>
          Cliente
          <ResponsiveSelect
            value={clientId}
            onChange={(v) => {
              setClientId(v);
              setVehicleId("");
            }}
            options={clientOptions}
            placeholderOptionLabel="Selecciona cliente"
            modalTitle="Cliente"
            required
          />
        </label>
        <label>
          Vehículo
          <ResponsiveSelect
            value={vehicleId}
            onChange={setVehicleId}
            options={vehicleOptions}
            placeholderOptionLabel={vehicles.length ? "Selecciona vehículo" : "Sin vehículos"}
            modalTitle="Vehículo"
            required
            disabled={!clientId || vehicles.length === 0}
          />
        </label>
        <label>
          Inicio programado
          <input
            className="input"
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
          />
        </label>
        <label>
          Fin programado
          <input
            className="input"
            type="datetime-local"
            value={scheduledEnd}
            onChange={(e) => setScheduledEnd(e.target.value)}
          />
        </label>
        <label>
          Check-in (inicio real, opcional)
          <input className="input" type="datetime-local" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
        </label>
        <label>
          Completado (opcional)
          <input
            className="input"
            type="datetime-local"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
          />
        </label>
        <label>
          Notas
          <textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} required />
        </label>
        {error ? <p style={{ color: "#ff8f9c", margin: 0 }}>{error}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link className="button secondary" href={`/dashboard/orders/assigned/${order.id}`}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
