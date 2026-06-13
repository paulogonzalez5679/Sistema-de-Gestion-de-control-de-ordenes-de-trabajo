import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { redactServicePricing, stripServicePricingFromPayload } from "@/lib/service-pricing-access";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { deleteService, getServiceById, updateService } from "@/modules/services/service.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("services.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const service = await getServiceById(id);
    if (!service) return notFound("Service");
    return ok(redactServicePricing(service, auth.profile.role));
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("services.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const before = await getServiceById(id);
    const updated = await updateService(id, stripServicePricingFromPayload(body, auth.profile.role));
    if (!updated) return notFound("Service");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "service.updated",
      entityType: "service",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} actualizó el servicio «${before?.name ?? updated.name}».`,
      metadata: { service_id: id }
    });
    return ok(redactServicePricing(updated, auth.profile.role));
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  return PATCH(request, { params });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("services.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const before = await getServiceById(id);
    const removed = await deleteService(id);
    if (!removed) return notFound("Service");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "service.deleted",
      entityType: "service",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} eliminó el servicio «${before?.name ?? id}».`,
      metadata: { service_id: id }
    });
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
