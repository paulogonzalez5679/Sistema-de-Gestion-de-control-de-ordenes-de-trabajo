import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { isUuid } from "@/lib/ids";
import { requirePermission } from "@/lib/permissions";
import { gateOrderById } from "@/lib/order-access";
import { setOrderServicesSchema } from "@/lib/schemas/order-line";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import {
  redactWorkOrderServicePricing,
  resolveServiceLinePricesFromCatalog
} from "@/lib/service-pricing-access";
import { getOrderServices, setOrderServices } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("orders.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    if (!isUuid(id)) return badRequest("Identificador de orden inválido.");
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;
    const services = await getOrderServices(id);
    return ok(services.map((line) => redactWorkOrderServicePricing(line, auth.profile.role)));
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
    const gate = await gateOrderById(auth.profile, id);
    if (!gate.ok) return gate.response;

    const parsed = await parseJsonBody(request, setOrderServicesSchema);
    if ("response" in parsed) return parsed.response;

    let resolvedItems;
    try {
      resolvedItems = await resolveServiceLinePricesFromCatalog(parsed.data.items);
    } catch {
      return badRequest("Uno o más servicios seleccionados no existen en el catálogo.");
    }

    const updated = await setOrderServices(id, resolvedItems);
    return ok(updated.map((line) => redactWorkOrderServicePricing(line, auth.profile.role)));
  } catch (error) {
    return internalError(error);
  }
}
