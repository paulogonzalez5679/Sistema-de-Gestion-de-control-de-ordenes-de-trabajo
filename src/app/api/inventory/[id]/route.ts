import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { inventoryUpdateSchema } from "@/lib/schemas/inventory";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import {
  deleteInventory,
  getInventoryById,
  updateInventory
} from "@/modules/inventory/inventory.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("inventory.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const item = await getInventoryById(id);
    if (!item) return notFound("Inventory item");
    return ok(item);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("inventory.update");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const parsed = await parseJsonBody(request, inventoryUpdateSchema);
    if ("response" in parsed) return parsed.response;
    const updated = await updateInventory(id, parsed.data);
    if (!updated) return notFound("Inventory item");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "inventory.updated",
      entityType: "inventory_item",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} actualizó el inventario «${updated.name}».`,
      metadata: { item_id: id }
    });
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, ctx: Params) {
  return PATCH(request, ctx);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("inventory.delete");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const before = await getInventoryById(id);
    const removed = await deleteInventory(id);
    if (!removed) return notFound("Inventory item");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "inventory.deleted",
      entityType: "inventory_item",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} eliminó el producto «${before?.name ?? id}».`,
      metadata: { item_id: id }
    });
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
