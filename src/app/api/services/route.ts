import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createService, getAllServices } from "@/modules/services/service.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("services.read");
    if ("denied" in auth) return auth.denied;

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false";
    const services = await getAllServices(activeOnly);
    return ok(services);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("services.manage");
    if ("denied" in auth) return auth.denied;

    const body = await request.json();
    if (!body?.name) return badRequest("name is required");
    const created = await createService({
      name: body.name,
      description: body.description ?? null,
      base_price: Number(body.base_price ?? 0),
      estimated_minutes: Number(body.estimated_minutes ?? 60),
      is_bundle: Boolean(body.is_bundle),
      is_active: body.is_active ?? true,
      reward_points: Math.max(0, Math.floor(Number(body.reward_points ?? 0)))
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
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
