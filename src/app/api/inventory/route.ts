import { NextRequest } from "next/server";
import { badRequest, internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { inventoryCreateSchema, inventoryUpdateWithIdSchema } from "@/lib/schemas/inventory";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import {
  createInventory,
  deleteInventory,
  getInventoryById,
  listInventoryPage,
  updateInventory
} from "@/modules/inventory/inventory.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.read");
    if ("denied" in auth) return auth.denied;

    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const item = await getInventoryById(id);
      if (!item) return notFound("Inventory item");
      return ok(item);
    }
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const category = request.nextUrl.searchParams.get("category") ?? undefined;
    const stockStatus = (request.nextUrl.searchParams.get("stockStatus") ?? undefined) as
      | "in_stock"
      | "low_stock"
      | "out_of_stock"
      | undefined;
    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_LIST_PAGE_SIZE) || DEFAULT_LIST_PAGE_SIZE)
    );
    const offset = offsetForPage(page, pageSize);
    const { items, total } = await listInventoryPage({ search, category, stockStatus }, { limit: pageSize, offset });
    return ok({ items, total, page, pageSize });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.create");
    if ("denied" in auth) return auth.denied;

    const parsed = await parseJsonBody(request, inventoryCreateSchema);
    if ("response" in parsed) return parsed.response;
    const data = parsed.data;
    const created = await createInventory({
      name: data.name,
      sku: data.sku,
      category: data.category,
      supplier: data.supplier,
      unit_cost: data.unit_cost ?? 0,
      quantity: data.quantity ?? 0,
      reorder_point: data.reorder_point ?? 0,
      notes: data.notes ?? null
    });
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "inventory.created",
      entityType: "inventory_item",
      entityId: created.id,
      workOrderId: null,
      summary: `${actor.full_name} creó el producto de inventario «${created.name}» (SKU ${created.sku}).`,
      metadata: { item_id: created.id, sku: created.sku }
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.update");
    if ("denied" in auth) return auth.denied;

    const parsed = await parseJsonBody(request, inventoryUpdateWithIdSchema);
    if ("response" in parsed) return parsed.response;
    const { id: bodyId, ...patch } = parsed.data;
    const id = bodyId ?? request.nextUrl.searchParams.get("id");
    if (!id) return badRequest("id is required");
    const updated = await updateInventory(id, patch);
    if (!updated) return notFound("Inventory item");
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission("inventory.delete");
    if ("denied" in auth) return auth.denied;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return badRequest("id query parameter is required");
    const removed = await deleteInventory(id);
    if (!removed) return notFound("Inventory item");
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
