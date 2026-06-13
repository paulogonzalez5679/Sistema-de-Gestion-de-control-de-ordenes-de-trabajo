import { NextRequest } from "next/server";
import { z } from "zod";
import { ecuadorWallDateTimeToUtcIso } from "@/lib/app-timezone";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { canPickOrderAssignee, canViewAllWorkOrders } from "@/lib/roles";
import { requirePermission } from "@/lib/permissions";
import { orderHeaderSchema } from "@/lib/schemas/work-order";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createOrder, getAllOrders } from "@/modules/orders/order.service";
import { notifyOrderCreated } from "@/modules/notifications/order-events";
import type { WorkOrderStatus } from "@/lib/types";

function buildOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  return `WO-${stamp}`;
}

const ORDER_STATUSES: WorkOrderStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "paused",
  "pending_invoice",
  "invoiced",
  "cancelled"
];

function parseOrderStatusParam(raw: string | null): WorkOrderStatus | undefined {
  if (!raw) return undefined;
  return ORDER_STATUSES.includes(raw as WorkOrderStatus) ? (raw as WorkOrderStatus) : undefined;
}

/**
 * El endpoint legacy mantiene el campo `total_amount` (origen: cliente). Para no degradar la
 * compatibilidad, lo aceptamos junto al `order` validado. El flujo nuevo recomendado es
 * `/api/orders/bundle` que calcula totales en base de datos.
 */
const createOrderLegacySchema = orderHeaderSchema.and(
  z.object({
    total_amount: z.coerce
      .number({ invalid_type_error: "Total no válido." })
      .positive("El total debe reflejar al menos un servicio seleccionado.")
  })
);

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const statusRaw = request.nextUrl.searchParams.get("status");
    if (statusRaw !== null && statusRaw !== "" && !ORDER_STATUSES.includes(statusRaw as WorkOrderStatus)) {
      return badRequest("El filtro status no es un valor permitido.");
    }
    const status = parseOrderStatusParam(statusRaw);
    const orders = await getAllOrders(search, status, {
      assigneeUserId: canViewAllWorkOrders(auth.profile.role) ? undefined : auth.profile.id
    });
    return ok(orders);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("orders.create");
    if ("denied" in auth) return auth.denied;

    const parsed = await parseJsonBody(request, createOrderLegacySchema);
    if ("response" in parsed) return parsed.response;
    const data = parsed.data;

    let scheduled_start: string;
    let scheduled_end: string;
    try {
      scheduled_start = ecuadorWallDateTimeToUtcIso(data.scheduled_start.trim());
      scheduled_end = ecuadorWallDateTimeToUtcIso(data.scheduled_end.trim());
    } catch {
      return badRequest("Las fechas de inicio o fin programado no son válidas.");
    }

    const created = await createOrder({
      order_number: data.order_number?.trim() || buildOrderNumber(),
      client_id: data.client_id,
      vehicle_id: data.vehicle_id,
      assigned_to: canPickOrderAssignee(auth.profile.role) ? data.assigned_to : auth.profile.id,
      status: data.status ?? "assigned",
      priority: data.priority,
      scheduled_start,
      scheduled_end,
      total_amount: data.total_amount,
      notes: data.notes.trim()
    });

    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "order.created",
      entityType: "work_order",
      entityId: created.id,
      workOrderId: created.id,
      summary: `${actor.full_name} creó la orden ${created.order_number}.`,
      metadata: {
        order_number: created.order_number,
        client_id: created.client_id,
        vehicle_id: created.vehicle_id,
        assigned_to: created.assigned_to,
        status: created.status
      }
    });

    await notifyOrderCreated(created);

    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
