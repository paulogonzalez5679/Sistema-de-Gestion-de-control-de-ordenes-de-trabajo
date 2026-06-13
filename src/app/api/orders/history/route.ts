import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { listOrderHistoryInRange } from "@/modules/orders/order.service";

function optionalIsoQuery(value: string | null): string | undefined {
  if (value === null || value.trim() === "") return undefined;
  const t = value.trim();
  if (Number.isNaN(Date.parse(t))) return "__invalid__";
  return t;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("orders.view_history");
    if ("denied" in auth) return auth.denied;

    const start = optionalIsoQuery(request.nextUrl.searchParams.get("start"));
    const end = optionalIsoQuery(request.nextUrl.searchParams.get("end"));
    if (start === "__invalid__" || end === "__invalid__") {
      return badRequest("Los parámetros start y end deben ser fechas ISO válidas.");
    }
    if (!start || !end) {
      return badRequest("Los parámetros start y end son obligatorios.");
    }

    const orders = await listOrderHistoryInRange({
      startISO: start,
      endISO: end
    });

    return ok(orders);
  } catch (error) {
    return internalError(error);
  }
}
