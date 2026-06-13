import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { getAllClients, searchClientsForOrderIdentification } from "@/modules/clients/client.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("clients.read");
    if ("denied" in auth) return auth.denied;

    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const forOrder = request.nextUrl.searchParams.get("forOrder") === "1";
    const clients = search
      ? forOrder
        ? await searchClientsForOrderIdentification(search)
        : await getAllClients(search)
      : await getAllClients();
    return ok(clients);
  } catch (error) {
    return internalError(error);
  }
}

/**
 * No se admiten altas de cliente «sueltas»: en base no debe existir un cliente sin al menos un vehículo
 * asociado al mismo flujo de registro. Usar `POST /api/clients/complete-registration`.
 */
export async function POST() {
  return badRequest(
    "Un cliente solo se guarda si se registra junto con al menos un vehículo (datos + foto). No se guarda ningún dato del cliente hasta completar ese flujo. Usa Clientes → Nuevo o POST /api/clients/complete-registration."
  );
}
