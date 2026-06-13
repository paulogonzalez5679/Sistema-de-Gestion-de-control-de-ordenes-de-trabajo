import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { isUuid } from "@/lib/ids";
import { requirePermission } from "@/lib/permissions";
import { gateOrderById } from "@/lib/order-access";
import { redactWorkOrderServicePricing } from "@/lib/service-pricing-access";
import { getOrderHistoryDetail } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.view_history");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    if (!isUuid(id)) return notFound("Order");
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const detail = await getOrderHistoryDetail(id);
    if (!detail) return notFound("Order");

    return ok({
      ...detail,
      orderServices: detail.orderServices.map((line) =>
        redactWorkOrderServicePricing(line, auth.profile.role)
      )
    });
  } catch (error) {
    return internalError(error);
  }
}
