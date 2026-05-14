import type { OutboxEvent, OutboxTopic } from "@/modules/outbox/outbox.service";
import {
  notifyOrderAssigneeChanged,
  notifyOrderCreated,
  notifyOrderFinished,
  notifyOrderStarted
} from "@/modules/notifications/order-events";
import {
  notifyCatalogRewardRedeemed,
  notifyClientEarnedLoyaltyPoints,
  notifyFreeServiceRedeemed
} from "@/modules/notifications/loyalty-events";
import { getOrderById } from "@/modules/orders/order.service";
import type { WorkOrder } from "@/lib/types";

/**
 * Conecta cada topic del outbox a su handler de aplicación.
 *
 * Convenciones de payload:
 *   notify.order.*                    : { order_id: string, extra?: ... }
 *   notify.loyalty.points_awarded     : { client_id, order_number, points }
 *   notify.loyalty.free_service_*     : { client_id, actor_name, previous_balance }
 *   notify.loyalty.catalog_reward_*   : { client_id, actor_name, reward_title }
 *
 * Cualquier handler debe ser idempotente o, como mínimo, tolerante a re-ejecutar el
 * mismo evento sin romper estado (el worker reintenta en caso de fallo).
 */

type Handler = (event: OutboxEvent) => Promise<void>;

async function loadOrderOrThrow(payload: Record<string, unknown>): Promise<WorkOrder> {
  const id = typeof payload.order_id === "string" ? payload.order_id : null;
  if (!id) throw new Error("order_id requerido en payload.");
  const order = await getOrderById(id);
  if (!order) throw new Error(`Orden ${id} no encontrada.`);
  return order;
}

const handlers: Record<OutboxTopic, Handler> = {
  "notify.order.created": async (e) => {
    const order = await loadOrderOrThrow(e.payload);
    await notifyOrderCreated(order);
  },
  "notify.order.started": async (e) => {
    const order = await loadOrderOrThrow(e.payload);
    await notifyOrderStarted(order);
  },
  "notify.order.finished": async (e) => {
    const order = await loadOrderOrThrow(e.payload);
    await notifyOrderFinished(order);
  },
  "notify.order.assignee_changed": async (e) => {
    const order = await loadOrderOrThrow(e.payload);
    const previousAssigneeName =
      typeof e.payload.previous_assignee_name === "string" ? e.payload.previous_assignee_name : null;
    const newAssigneeName =
      typeof e.payload.new_assignee_name === "string" ? e.payload.new_assignee_name : null;
    await notifyOrderAssigneeChanged({ order, previousAssigneeName, newAssigneeName });
  },
  "notify.loyalty.points_awarded": async (e) => {
    const clientId = e.payload.client_id as string;
    const orderNumber = e.payload.order_number as string;
    const points = Number(e.payload.points ?? 0);
    await notifyClientEarnedLoyaltyPoints({ clientId, orderNumber, points });
  },
  "notify.loyalty.free_service_redeemed": async (e) => {
    await notifyFreeServiceRedeemed({
      clientId: e.payload.client_id as string,
      actorName: (e.payload.actor_name as string) ?? "Operador",
      previousBalance: Number(e.payload.previous_balance ?? 0)
    });
  },
  "notify.loyalty.catalog_reward_redeemed": async (e) => {
    await notifyCatalogRewardRedeemed({
      clientId: e.payload.client_id as string,
      actorName: (e.payload.actor_name as string) ?? "Operador",
      rewardTitle: (e.payload.reward_title as string) ?? "Recompensa"
    });
  },
  "export.audit_pdf": async () => {
    // Placeholder para job pesado (PDF batch). La implementación concreta se
    // añadirá cuando exista el caso de uso de exportación programada.
    throw new Error("export.audit_pdf handler aún no implementado.");
  }
};

export async function processOutboxEvent(event: OutboxEvent): Promise<void> {
  const handler = handlers[event.topic];
  if (!handler) {
    throw new Error(`No hay handler para topic '${event.topic}'.`);
  }
  await handler(event);
}
