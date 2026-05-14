import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { getOrderById } from "@/modules/orders/order.service";
import { recordAuditEvent } from "@/modules/audit/audit.service";

type Params = { params: Promise<{ id: string }> };

/** Registra apertura de detalle de orden (operadores) para auditoría. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.view_audit_beacon");
    if ("denied" in auth) return auth.denied;
    const profile = auth.profile;

    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) return notFound("Order");

    let body: { context?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const ctx = body.context === "active" ? "active" : body.context === "summary" ? "summary" : "assigned";
    let summary: string;
    if (ctx === "active") {
      summary = `Abrió la vista de ejecución de la orden ${order.order_number}.`;
    } else if (ctx === "summary") {
      summary = `Consultó la vista general / detalle de la orden ${order.order_number}.`;
    } else {
      summary = `Consultó el detalle de orden asignada ${order.order_number}.`;
    }

    await recordAuditEvent({
      actorId: profile.id,
      action: "order.detail_opened",
      entityType: "work_order",
      entityId: id,
      workOrderId: id,
      summary,
      metadata: {
        context: ctx,
        order_number: order.order_number,
        previous_status: order.status
      }
    });

    return ok({ logged: true });
  } catch (error) {
    return internalError(error);
  }
}
