import { NextRequest } from "next/server";
import { ecuadorWallDateTimeToUtcIso } from "@/lib/app-timezone";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { canPickOrderAssignee, canViewAllWorkOrders, canViewServicePricing } from "@/lib/roles";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { resolveServiceLinePricesFromCatalog } from "@/lib/service-pricing-access";
import { createWorkOrderBundleSchema } from "@/lib/schemas/work-order";
import { createWorkOrderBundle } from "@/modules/orders/order-bundle.usecase";

/**
 * Alta atómica de una orden completa (orden + servicios + productos en una sola transacción).
 *
 * Cabeceras:
 *   - Idempotency-Key (obligatoria): UUID o cadena estable que permite reintentos seguros
 *     desde el cliente. Dos llamadas con la misma clave y mismo payload devuelven la misma orden;
 *     si el payload cambia, se rechaza con 409.
 *
 * Cuerpo (JSON):
 *   { order: { ... }, services: [...], products?: [...] }
 *
 * Reemplaza al patrón cliente "POST /api/orders + PUT /api/orders/:id/services + POST products"
 * eliminando estados intermedios inconsistentes.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("orders.create");
    if ("denied" in auth) return auth.denied;

    const idempotencyKey = (request.headers.get("idempotency-key") ?? "").trim();
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120) {
      return badRequest("Falta cabecera Idempotency-Key (8–120 caracteres).");
    }

    const raw: unknown = await request.json();
    const parsed = createWorkOrderBundleSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Cuerpo de solicitud inválido.");
    }

    let scheduled_start: string;
    let scheduled_end: string;
    try {
      scheduled_start = ecuadorWallDateTimeToUtcIso(parsed.data.order.scheduled_start.trim());
      scheduled_end = ecuadorWallDateTimeToUtcIso(parsed.data.order.scheduled_end.trim());
    } catch {
      return badRequest("Las fechas de inicio o fin programado no son válidas.");
    }

    const requestedDiscount = Math.max(0, Number(parsed.data.order.discount_amount ?? 0));
    if (requestedDiscount > 0 && !hasPermission(auth.profile.role, "orders.apply_discount")) {
      return badRequest("No tienes permiso para aplicar descuentos.");
    }

    const orderHeader = {
      ...parsed.data.order,
      scheduled_start,
      scheduled_end,
      status: parsed.data.order.status ?? "assigned",
      order_number: parsed.data.order.order_number ?? null,
      assigned_to: canPickOrderAssignee(auth.profile.role)
        ? parsed.data.order.assigned_to
        : auth.profile.id,
      discount_amount: hasPermission(auth.profile.role, "orders.apply_discount") ? requestedDiscount : 0
    };

    let resolvedServices;
    try {
      resolvedServices = await resolveServiceLinePricesFromCatalog(parsed.data.services);
    } catch {
      return badRequest("Uno o más servicios seleccionados no existen en el catálogo.");
    }

    const result = await createWorkOrderBundle({
      idempotencyKey,
      actorId: auth.profile.id,
      order: orderHeader,
      services: resolvedServices,
      products: parsed.data.products
    });

    if (!result.ok) {
      // Idempotencia reutilizada con payload distinto → 409 conflict (no es bad request del usuario).
      if (result.error.includes("idempotencia")) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 409,
          headers: { "content-type": "application/json" }
        });
      }
      return badRequest(result.error);
    }

    const showPricing = canViewServicePricing(auth.profile.role);
    return ok(
      {
        id: result.work_order_id,
        order_number: result.order_number,
        ...(showPricing ? { total_amount: result.total_amount } : {}),
        replayed: result.replayed
      },
      { status: result.replayed ? 200 : 201 }
    );
  } catch (error) {
    return internalError(error);
  }
}
