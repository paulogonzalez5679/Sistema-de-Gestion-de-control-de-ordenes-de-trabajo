import { NextRequest } from "next/server";
import { internalError, ok } from "@/lib/api-response";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/lib/permissions";
import { inventoryMovementCreateSchema } from "@/lib/schemas/inventory";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { addInventoryMovement, listInventoryMovementsPage } from "@/modules/inventory/inventory.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.movement.read");
    if ("denied" in auth) return auth.denied;

    const itemId = request.nextUrl.searchParams.get("itemId") ?? undefined;
    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_LIST_PAGE_SIZE) || DEFAULT_LIST_PAGE_SIZE
      )
    );
    const offset = offsetForPage(page, pageSize);
    const { movements, total } = await listInventoryMovementsPage(itemId, { limit: pageSize, offset });
    return ok({ items: movements, total, page, pageSize });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.movement.create");
    if ("denied" in auth) return auth.denied;

    const parsed = await parseJsonBody(request, inventoryMovementCreateSchema);
    if ("response" in parsed) return parsed.response;
    const data = parsed.data;

    const created = await addInventoryMovement({
      item_id: data.item_id,
      movement_type: data.movement_type,
      quantity_delta: data.quantity_delta,
      reason: data.reason,
      work_order_id: data.work_order_id,
      created_by: auth.profile.id
    });
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "inventory.movement",
      entityType: "inventory_item",
      entityId: data.item_id,
      workOrderId: data.work_order_id ?? null,
      summary: `${actor.full_name} registró movimiento de inventario (${data.movement_type}, Δ${data.quantity_delta}).`,
      metadata: {
        movement_id: created.id,
        item_id: data.item_id,
        movement_type: data.movement_type,
        quantity_delta: data.quantity_delta
      }
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
