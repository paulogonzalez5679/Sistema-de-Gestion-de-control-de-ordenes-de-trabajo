import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { redactServicePricing, redactServicesPricing, stripServicePricingFromPayload } from "@/lib/service-pricing-access";
import { canViewServicePricing } from "@/lib/roles";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createService, getAllServices } from "@/modules/services/service.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("services.read");
    if ("denied" in auth) return auth.denied;

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false";
    const services = await getAllServices(activeOnly);
    return ok(redactServicesPricing(services, auth.profile.role));
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("services.manage");
    if ("denied" in auth) return auth.denied;

    const body = (await request.json()) as Record<string, unknown>;
    if (!body?.name) return badRequest("name is required");
    const safeBody = stripServicePricingFromPayload(body, auth.profile.role);
    const created = await createService({
      name: String(safeBody.name),
      description: safeBody.description != null ? String(safeBody.description) : null,
      base_price: canViewServicePricing(auth.profile.role) ? Number(body.base_price ?? 0) : 0,
      estimated_minutes: Number(safeBody.estimated_minutes ?? body.estimated_minutes ?? 60),
      is_bundle: Boolean(safeBody.is_bundle ?? body.is_bundle),
      is_active: (safeBody.is_active ?? body.is_active ?? true) as boolean,
      reward_points: Math.max(0, Math.floor(Number(safeBody.reward_points ?? body.reward_points ?? 0)))
    });
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "service.created",
      entityType: "service",
      entityId: created.id,
      workOrderId: null,
      summary: `${actor.full_name} creó el servicio «${created.name}».`,
      metadata: { service_id: created.id }
    });
    return ok(redactServicePricing(created, auth.profile.role), { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
