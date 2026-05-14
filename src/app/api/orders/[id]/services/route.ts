import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { isUuid } from "@/lib/ids";
import { requirePermission } from "@/lib/permissions";
import { setOrderServicesSchema } from "@/lib/schemas/order-line";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { getOrderServices, setOrderServices } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    if (!isUuid(id)) return badRequest("Identificador de orden inválido.");
    const services = await getOrderServices(id);
    return ok(services);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.set_services");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    if (!isUuid(id)) return badRequest("Identificador de orden inválido.");

    const parsed = await parseJsonBody(request, setOrderServicesSchema);
    if ("response" in parsed) return parsed.response;

    const updated = await setOrderServices(id, parsed.data.items);
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}
