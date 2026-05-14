import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { publishOutbox } from "@/modules/outbox/outbox.service";
import type { WorkOrderPriority, WorkOrderStatus } from "@/lib/types";

export type CreateWorkOrderBundleInput = {
  order: {
    client_id: string;
    vehicle_id: string;
    assigned_to: string;
    status: WorkOrderStatus;
    priority: WorkOrderPriority;
    scheduled_start: string;
    scheduled_end: string;
    notes: string;
    order_number?: string | null;
    discount_amount?: number;
  };
  services: Array<{ service_id: string; price: number }>;
  products?: Array<{ item_id: string; quantity: number; unit_price?: number }>;
  idempotencyKey: string;
  actorId: string;
};

export type CreateWorkOrderBundleResult =
  | {
      ok: true;
      replayed: boolean;
      work_order_id: string;
      order_number: string;
      total_amount: number;
    }
  | { ok: false; error: string };

/**
 * Orquesta la creación atómica de una orden completa (orden + servicios + productos + movimientos +
 * auditoría) llamando al RPC `create_work_order_bundle`. La idempotencia se garantiza en base de
 * datos a partir de `idempotencyKey`: dos llamadas con la misma clave y mismo payload devolverán
 * la misma orden sin duplicar escrituras; si el payload cambia, falla con `IDM01`.
 *
 * Los side-effects no críticos (notificación visible para el equipo) se ejecutan fuera de la
 * transacción del RPC; un fallo aquí no rompe la creación de la orden.
 */
export async function createWorkOrderBundle(
  input: CreateWorkOrderBundleInput
): Promise<CreateWorkOrderBundleResult> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("create_work_order_bundle", {
    payload: {
      idempotency_key: input.idempotencyKey,
      actor_id: input.actorId,
      order: input.order,
      services: input.services,
      products: input.products ?? []
    }
  });

  if (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code === "IDM01") {
      return { ok: false, error: "La clave de idempotencia se reutilizó con datos distintos." };
    }
    if (code === "INV01") {
      return { ok: false, error: error.message || "Stock insuficiente para algún producto." };
    }
    throw error;
  }

  const row = data as {
    work_order_id?: string;
    order_number?: string;
    total_amount?: number;
    replayed?: boolean;
  } | null;

  if (!row?.work_order_id) {
    return { ok: false, error: "No se pudo crear la orden." };
  }

  // Publicamos la notificación en el outbox: si el worker tarda o falla, la creación
  // de la orden ya está confirmada. No bloqueamos la respuesta de la API por un
  // side-effect informativo.
  if (!row.replayed) {
    await publishOutbox({
      topic: "notify.order.created",
      payload: { order_id: row.work_order_id }
    });
  }

  return {
    ok: true,
    replayed: Boolean(row.replayed),
    work_order_id: row.work_order_id,
    order_number: row.order_number ?? "",
    total_amount: Number(row.total_amount ?? 0)
  };
}
