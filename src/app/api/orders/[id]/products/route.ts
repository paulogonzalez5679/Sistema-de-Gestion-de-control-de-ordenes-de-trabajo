import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { addOrderProductSchema } from "@/lib/schemas/order-line";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import {
  addOrderProduct,
  getOrderProductsEnriched
} from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const lines = await getOrderProductsEnriched(id);
    return ok(lines);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.add_product");
    if ("denied" in auth) return auth.denied;

    const { id: workOrderId } = await params;
    const parsed = await parseJsonBody(request, addOrderProductSchema);
    if ("response" in parsed) return parsed.response;

    const created = await addOrderProduct({
      workOrderId,
      itemId: parsed.data.item_id,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unit_price,
      actorId: auth.profile.id
    });

    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return internalError(error);
  }
}
