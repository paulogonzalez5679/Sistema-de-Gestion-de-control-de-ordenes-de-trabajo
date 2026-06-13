import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { offsetForPage, parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/lib/permissions";
import { gateOrderById } from "@/lib/order-access";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { addOrderUpdate, getOrderUpdatesPage } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

const DEFAULT_NOTES_PAGE = 10;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    const pageSize = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_NOTES_PAGE) || DEFAULT_NOTES_PAGE)
    );
    const offset = offsetForPage(page, pageSize);
    const { updates, total } = await getOrderUpdatesPage(id, { limit: pageSize, offset });
    return ok({ items: updates, total, page, pageSize });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.add_note");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    if (!body?.message) return badRequest("message is required");

    const profile = auth.profile;
    const userId = profile.id;

    const created = await addOrderUpdate({
      work_order_id: id,
      service_id: body.service_id ?? null,
      user_id: userId,
      message: body.message
    });

    const order = gate.order;
    const preview =
      String(body.message).length > 160 ? `${String(body.message).slice(0, 160)}…` : String(body.message);

    await recordAuditEvent({
      actorId: userId,
      action: "order.note_added",
      entityType: "work_order",
      entityId: id,
      workOrderId: id,
      summary: order
        ? `${profile.full_name} añadió una nota en ${order.order_number}.`
        : `${profile.full_name} añadió una nota en la orden.`,
      metadata: {
        order_number: order.order_number,
        message_preview: preview,
        update_id: created.id
      }
    });

    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
