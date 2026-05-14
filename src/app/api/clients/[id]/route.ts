import { NextRequest } from "next/server";
import { badRequest, internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { deleteClient, getClientById, pickClientApiPatch, updateClient } from "@/modules/clients/client.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("clients.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const client = await getClientById(id);
    if (!client) return notFound("Client");
    return ok(client);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("clients.update");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const safePatch = pickClientApiPatch(body);
    if (Object.keys(safePatch).length === 0) {
      return badRequest("No se recibieron campos válidos para actualizar.");
    }
    const updated = await updateClient(id, safePatch);
    if (!updated) return notFound("Client");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "client.updated",
      entityType: "client",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} actualizó la ficha de «${updated.full_name}».`,
      metadata: { client_id: id }
    });
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  return PATCH(request, { params });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("clients.delete");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const before = await getClientById(id);
    if (!before) return notFound("Client");
    const actor = auth.profile;
    const removed = await deleteClient(id);
    if (!removed) return notFound("Client");
    await recordAuditEvent({
      actorId: actor.id,
      action: "client.deleted",
      entityType: "client",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} eliminó al cliente «${before.full_name}».`,
      metadata: { client_id: id }
    });
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
