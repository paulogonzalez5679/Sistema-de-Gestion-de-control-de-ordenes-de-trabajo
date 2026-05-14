import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { APP_DISPLAY_TIME_ZONE } from "@/lib/app-timezone";
import { createNotification } from "@/modules/notifications/notification.service";
import type { WorkOrder } from "@/lib/types";

/**
 * Notificaciones del ciclo de vida de la orden (visibles para todo el equipo: `user_id` null).
 * Incluye horarios programados vs reales y retrasos cuando aplica.
 */

type ContextLabels = {
  client: string;
  vehicle: string;
  assignee: string | null;
};

function formatLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: APP_DISPLAY_TIME_ZONE
    });
  } catch {
    return String(iso);
  }
}

/** Minutos de retraso si `actual` es estrictamente después de `deadline`. */
function minutesLateAfter(actualIso: string | null | undefined, deadlineIso: string | null | undefined): number | null {
  if (!actualIso || !deadlineIso) return null;
  const diff = Date.parse(actualIso) - Date.parse(deadlineIso);
  if (diff <= 0) return null;
  return Math.ceil(diff / 60000);
}

/** Duración en minutos entre dos instantes (si ambos existen). */
function durationMinutes(startIso: string | null | undefined, endIso: string | null | undefined): number | null {
  if (!startIso || !endIso) return null;
  const diff = Date.parse(endIso) - Date.parse(startIso);
  if (diff <= 0) return null;
  return Math.round(diff / 60000);
}

async function loadOrderContext(order: WorkOrder): Promise<ContextLabels> {
  const supabase = createSupabaseAdminClient();

  const [{ data: client }, { data: vehicle }, assigneeResult] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", order.client_id).maybeSingle(),
    supabase.from("vehicles").select("make, model, plate").eq("id", order.vehicle_id).maybeSingle(),
    order.assigned_to
      ? supabase.from("profiles").select("full_name").eq("id", order.assigned_to).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string } | null })
  ]);

  const vehicleLabel = vehicle
    ? `${vehicle.make} ${vehicle.model} · ${vehicle.plate}`
    : "vehículo sin identificar";

  return {
    client: client?.full_name ?? "Cliente sin identificar",
    vehicle: vehicleLabel,
    assignee: assigneeResult?.data?.full_name ?? null
  };
}

export async function notifyOrderCreated(order: WorkOrder): Promise<void> {
  try {
    const ctx = await loadOrderContext(order);
    const assigneeLine = ctx.assignee ? `Responsable asignado: ${ctx.assignee}.` : "Sin responsable asignado.";
    const schedule = `Programación: ${formatLocal(order.scheduled_start)} → ${formatLocal(order.scheduled_end)}.`;
    await createNotification({
      title: `Orden ${order.order_number} registrada`,
      body: `Nueva orden para ${ctx.client} (${ctx.vehicle}). ${assigneeLine} ${schedule}`,
      severity: "info",
      user_id: null,
      work_order_id: order.id,
      is_read: false
    });
  } catch (error) {
    console.error("notifyOrderCreated:", error);
  }
}

export async function notifyOrderStarted(order: WorkOrder): Promise<void> {
  try {
    const ctx = await loadOrderContext(order);
    const checkIn = order.check_in_at;
    const lateStart = minutesLateAfter(checkIn ?? null, order.scheduled_start);
    const startBlock = checkIn
      ? `Inicio real del trabajo: ${formatLocal(checkIn)}. Inicio programado: ${formatLocal(order.scheduled_start)}.${
          lateStart != null
            ? ` Retraso al iniciar: ${lateStart} min.`
            : " A tiempo o antes del inicio programado."
        }`
      : `Estado pasado a en ejecución. Inicio programado: ${formatLocal(order.scheduled_start)}.`;

    const endProg = `Fin programado de la ventana: ${formatLocal(order.scheduled_end)}.`;

    await createNotification({
      title: `Orden ${order.order_number} — trabajo iniciado`,
      body: `${ctx.assignee ?? "El equipo"} inició la ejecución para ${ctx.client} (${ctx.vehicle}). ${startBlock} ${endProg}`,
      severity: lateStart != null ? "warning" : "info",
      user_id: null,
      work_order_id: order.id,
      is_read: false
    });
  } catch (error) {
    console.error("notifyOrderStarted:", error);
  }
}

export async function notifyOrderFinished(order: WorkOrder): Promise<void> {
  try {
    const ctx = await loadOrderContext(order);
    const totalLabel = `$${Number(order.total_amount ?? 0).toFixed(2)}`;
    const completed = order.completed_at;
    const checkIn = order.check_in_at;
    const lateFinish = minutesLateAfter(completed ?? null, order.scheduled_end);
    const dur = durationMinutes(checkIn ?? null, completed ?? null);

    const timingParts: string[] = [];
    if (completed) {
      timingParts.push(`Fin real: ${formatLocal(completed)}.`);
      timingParts.push(`Fin programado: ${formatLocal(order.scheduled_end)}.`);
      if (lateFinish != null) {
        timingParts.push(`ATRASO respecto al fin programado: ${lateFinish} min.`);
      } else if (order.scheduled_end) {
        timingParts.push("Entrega a tiempo o antes del fin programado.");
      }
    }
    if (dur != null) {
      timingParts.push(`Tiempo en ejecución (desde inicio real): ${dur} min.`);
    }

    const timing = timingParts.length ? ` ${timingParts.join(" ")}` : "";

    await createNotification({
      title: `Orden ${order.order_number} — lista para facturar`,
      body: `Se marcó como terminada la orden de ${ctx.client} (${ctx.vehicle}). Total: ${totalLabel}.${timing} Pendiente de facturación.`,
      severity: lateFinish != null ? "warning" : "success",
      user_id: null,
      work_order_id: order.id,
      is_read: false
    });
  } catch (error) {
    console.error("notifyOrderFinished:", error);
  }
}

export async function notifyOrderAssigneeChanged(args: {
  order: WorkOrder;
  previousAssigneeName: string | null;
  newAssigneeName: string | null;
}): Promise<void> {
  try {
    const ctx = await loadOrderContext(args.order);
    const prev = args.previousAssigneeName ?? "Sin asignar";
    const next = args.newAssigneeName ?? "Sin asignar";
    await createNotification({
      title: `Orden ${args.order.order_number} — reasignación`,
      body: `La orden de ${ctx.client} (${ctx.vehicle}) cambió de responsable: «${prev}» → «${next}».`,
      severity: "info",
      user_id: null,
      work_order_id: args.order.id,
      is_read: false
    });
  } catch (e) {
    console.error("notifyOrderAssigneeChanged:", e);
  }
}
