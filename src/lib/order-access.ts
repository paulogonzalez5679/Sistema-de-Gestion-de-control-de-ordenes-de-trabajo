import { forbidden, notFound } from "@/lib/api-response";
import { isUuid } from "@/lib/ids";
import { canViewAllWorkOrders } from "@/lib/roles";
import type { Profile, WorkOrder } from "@/lib/types";
import { getOrderById } from "@/modules/orders/order.service";

export const ORDER_ASSIGNMENT_FORBIDDEN =
  "Solo puedes ver o gestionar órdenes asignadas a ti.";

export function canAccessOrder(profile: Profile, order: WorkOrder): boolean {
  if (canViewAllWorkOrders(profile.role)) return true;
  const assignee = order.assigned_to;
  return Boolean(assignee && assignee === profile.id);
}

export function gateOrderAccess(
  profile: Profile,
  order: WorkOrder
): { ok: true; order: WorkOrder } | { ok: false; response: Response } {
  if (!canAccessOrder(profile, order)) {
    return { ok: false, response: forbidden(ORDER_ASSIGNMENT_FORBIDDEN) };
  }
  return { ok: true, order };
}

export async function gateOrderById(
  profile: Profile,
  orderId: string
): Promise<{ ok: true; order: WorkOrder } | { ok: false; response: Response }> {
  if (!isUuid(orderId)) {
    return { ok: false, response: notFound("Order") };
  }
  const order = await getOrderById(orderId);
  if (!order) {
    return { ok: false, response: notFound("Order") };
  }
  return gateOrderAccess(profile, order);
}
