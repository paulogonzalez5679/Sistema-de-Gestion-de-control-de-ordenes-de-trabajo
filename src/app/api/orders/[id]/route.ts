import { NextRequest } from "next/server";
import { ecuadorWallDateTimeToUtcIso } from "@/lib/app-timezone";
import { badRequest, forbidden, internalError, notFound, ok } from "@/lib/api-response";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { formatOrderStatus } from "@/lib/ui-labels";
import type { UpdateWorkOrderInput } from "@/modules/orders/order.service";
import {
  deleteOrder,
  getOrderById,
  pickWorkOrderApiPatch,
  setOrderDiscount,
  syncAppointmentWithOrderSchedule,
  updateOrder
} from "@/modules/orders/order.service";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { awardPointsForCompletedOrder, sumRewardPointsForWorkOrder } from "@/modules/loyalty/loyalty.service";
import { notifyClientEarnedLoyaltyPoints } from "@/modules/notifications/loyalty-events";
import { notifyOrderAssigneeChanged, notifyOrderFinished, notifyOrderStarted } from "@/modules/notifications/order-events";
import type { ProfileRole, WorkOrder, WorkOrderStatus } from "@/lib/types";
import { getProfileByUserId } from "@/modules/profiles/profile.service";

type Params = { params: Promise<{ id: string }> };

const ORDER_DETAIL_PATCH_KEYS = [
  "assigned_to",
  "priority",
  "scheduled_start",
  "scheduled_end",
  "notes",
  "check_in_at",
  "completed_at",
  "client_id",
  "vehicle_id"
] as const;

function normalizeNaiveScheduleFields(raw: Record<string, unknown>) {
  for (const key of ["scheduled_start", "scheduled_end", "check_in_at", "completed_at"] as const) {
    const v = raw[key];
    if (typeof v !== "string" || !v.trim()) continue;
    try {
      raw[key] = ecuadorWallDateTimeToUtcIso(v.trim());
    } catch {
      /* dejar; pick/validación puede fallar */
    }
  }
}

function clientRequestedOrderDetailPatch(raw: Record<string, unknown>): boolean {
  return ORDER_DETAIL_PATCH_KEYS.some((k) => raw[k] !== undefined);
}

function assertStatusTransitionAllowed(
  role: ProfileRole | undefined,
  before: WorkOrderStatus,
  next: WorkOrderStatus
): Response | null {
  if (next === before) return null;

  if (next === "invoiced") {
    if (!hasPermission(role, "orders.transition_billing")) {
      return forbidden("Solo un administrador puede marcar la orden como facturada.");
    }
    if (before !== "pending_invoice") {
      return badRequest("Solo se puede facturar una orden en estado por facturar.");
    }
    return null;
  }

  if (next === "paused") {
    return badRequest("El estado pausado ya no está disponible; use inicio y fin de ejecución.");
  }

  if (next === "cancelled") {
    if (!hasPermission(role, "orders.transition_billing")) {
      return forbidden("Solo un administrador puede cancelar la orden.");
    }
    const cancellableWhile: WorkOrderStatus[] = ["draft", "assigned"];
    if (!cancellableWhile.includes(before)) {
      return badRequest(
        "Solo se puede cancelar una orden en borrador o asignada. Una vez en progreso ya no se puede cancelar."
      );
    }
    return null;
  }

  if (next === "pending_invoice") {
    const allowedFrom: WorkOrderStatus[] = ["assigned", "in_progress", "paused"];
    if (!allowedFrom.includes(before)) {
      return badRequest("No se puede pasar a por facturar desde el estado actual.");
    }
    return null;
  }

  return null;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) return notFound("Order");
    return ok(order);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.update");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const rawBody = (await request.json()) as Record<string, unknown>;
    normalizeNaiveScheduleFields(rawBody);
    const body = pickWorkOrderApiPatch(rawBody);
    const before = await getOrderById(id);
    if (!before) return notFound("Order");

    const sessionProfile = auth.profile;
    const role = sessionProfile?.role;

    if (clientRequestedOrderDetailPatch(rawBody) && !hasPermission(role, "orders.edit_details")) {
      return forbidden(
        "Solo un administrador puede editar programación, cliente, vehículo, notas y marcas de tiempo de la orden."
      );
    }

    if (body.status !== undefined && body.status !== before.status) {
      const denied = assertStatusTransitionAllowed(role, before.status, body.status);
      if (denied) return denied;
    }

    /** El descuento solo lo puede aplicar un administrador y solo en órdenes aún no facturadas/canceladas. */
    let discountChanged = false;
    let nextDiscount: number | undefined;
    if (rawBody.discount_amount !== undefined) {
      if (!hasPermission(role, "orders.apply_discount")) {
        return forbidden("Solo un administrador puede aplicar descuentos.");
      }
      if (before.status === "invoiced" || before.status === "cancelled") {
        return badRequest("No se puede modificar el descuento de una orden facturada o cancelada.");
      }
      nextDiscount = Math.max(0, Number(rawBody.discount_amount) || 0);
      discountChanged = Number(before.discount_amount ?? 0) !== nextDiscount;
    }

    const patch: UpdateWorkOrderInput = { ...body };
    if (body.status === "pending_invoice" && !before.completed_at && !body.completed_at) {
      patch.completed_at = new Date().toISOString();
    }
    if (body.status === "in_progress" && !before.check_in_at && !body.check_in_at) {
      patch.check_in_at = new Date().toISOString();
    }

    const hasColumnPatch = Object.keys(patch).length > 0;
    if (!hasColumnPatch && rawBody.discount_amount === undefined) {
      return badRequest("Sin cambios.");
    }

    let updated: WorkOrder = before;
    if (hasColumnPatch) {
      const u = await updateOrder(id, patch);
      if (!u) return notFound("Order");
      updated = u;
    }

    if (nextDiscount !== undefined) {
      await setOrderDiscount(id, nextDiscount);
      updated = (await getOrderById(id)) ?? updated;
    }

    if (
      (body.scheduled_start !== undefined || body.scheduled_end !== undefined) &&
      updated.scheduled_start &&
      updated.scheduled_end
    ) {
      try {
        await syncAppointmentWithOrderSchedule(id, updated.scheduled_start, updated.scheduled_end);
      } catch (syncErr) {
        console.error("syncAppointmentWithOrderSchedule:", syncErr);
      }
    }

    const actorId = sessionProfile?.id ?? null;

    if (body.status !== undefined && body.status !== before.status) {
      await recordAuditEvent({
        actorId,
        action: "order.status_changed",
        entityType: "work_order",
        entityId: id,
        workOrderId: id,
        summary: `${sessionProfile?.full_name ?? "Usuario"} cambió el estado de ${before.order_number}: ${formatOrderStatus(before.status)} → ${formatOrderStatus(updated.status)}.`,
        metadata: {
          order_number: before.order_number,
          from_status: before.status,
          to_status: updated.status
        }
      });
    }

    if (before.assigned_to !== updated.assigned_to) {
      const [prevProf, nextProf] = await Promise.all([
        before.assigned_to ? getProfileByUserId(before.assigned_to) : Promise.resolve(null),
        updated.assigned_to ? getProfileByUserId(updated.assigned_to) : Promise.resolve(null)
      ]);
      await recordAuditEvent({
        actorId,
        action: "order.assignee_changed",
        entityType: "work_order",
        entityId: id,
        workOrderId: id,
        summary: `${sessionProfile?.full_name ?? "Usuario"} reasignó ${before.order_number}: ${prevProf?.full_name ?? "—"} → ${nextProf?.full_name ?? "—"}.`,
        metadata: {
          order_number: before.order_number,
          from_assignee: before.assigned_to,
          to_assignee: updated.assigned_to
        }
      });
      await notifyOrderAssigneeChanged({
        order: updated,
        previousAssigneeName: prevProf?.full_name ?? null,
        newAssigneeName: nextProf?.full_name ?? null
      });
    }

    if (discountChanged && nextDiscount !== undefined) {
      await recordAuditEvent({
        actorId,
        action: "order.discount_changed",
        entityType: "work_order",
        entityId: id,
        workOrderId: id,
        summary: `${sessionProfile?.full_name ?? "Administrador"} actualizó el descuento de ${before.order_number}: $${Number(before.discount_amount ?? 0).toFixed(2)} → $${nextDiscount.toFixed(2)}.`,
        metadata: {
          order_number: before.order_number,
          previous_discount: Number(before.discount_amount ?? 0),
          new_discount: nextDiscount
        }
      });
    }

    if (before.status !== "in_progress" && updated.status === "in_progress") {
      await notifyOrderStarted(updated);
    }

    if (before.status !== "pending_invoice" && updated.status === "pending_invoice") {
      await notifyOrderFinished(updated);
      try {
        const awarded = await awardPointsForCompletedOrder(updated);
        if (awarded) {
          const pts = await sumRewardPointsForWorkOrder(updated.id);
          await notifyClientEarnedLoyaltyPoints({
            clientId: updated.client_id,
            orderNumber: updated.order_number,
            points: pts
          });
        }
      } catch (loyaltyError) {
        console.error("awardPointsForCompletedOrder:", loyaltyError);
      }
    }

    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  return PATCH(request, { params });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.delete");
    if ("denied" in auth) return auth.denied;
    const sessionProfile = auth.profile;

    const { id } = await params;
    const before = await getOrderById(id);
    if (!before) return notFound("Order");

    const removed = await deleteOrder(id);
    if (!removed) return notFound("Order");

    await recordAuditEvent({
      actorId: sessionProfile.id,
      action: "order.deleted",
      entityType: "work_order",
      entityId: id,
      workOrderId: id,
      summary: `${sessionProfile.full_name} eliminó la orden ${before.order_number}.`,
      metadata: {
        order_number: before.order_number,
        previous_status: before.status
      }
    });

    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
