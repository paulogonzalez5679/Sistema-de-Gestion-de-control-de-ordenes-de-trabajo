import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { removeOrderProduct } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.remove_product");
    if ("denied" in auth) return auth.denied;

    const { id: workOrderId, lineId } = await params;
    const removed = await removeOrderProduct({
      workOrderId,
      lineId,
      actorId: auth.profile.id
    });
    if (!removed) return notFound("Order product line");
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
