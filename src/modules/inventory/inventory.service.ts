import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import type { InventoryItem, InventoryMovement, InventoryMovementType } from "@/lib/types";

export type CreateInventoryItemInput = Omit<InventoryItem, "id" | "created_at" | "updated_at">;
export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;

export async function getAllInventory(filters?: {
  search?: string;
  category?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
}): Promise<InventoryItem[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("inventory_items").select("*").order("updated_at", { ascending: false });
  const safeSearch = sanitizePostgrestSearchToken(filters?.search);
  if (safeSearch) {
    query = query.or(
      `name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,supplier.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`
    );
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  const { data, error } = await query;
  if (error) throw error;
  let items = (data ?? []) as InventoryItem[];
  if (filters?.stockStatus === "out_of_stock") {
    items = items.filter((item) => Number(item.quantity) === 0);
  }
  if (filters?.stockStatus === "low_stock") {
    items = items.filter((item) => Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.reorder_point));
  }
  if (filters?.stockStatus === "in_stock") {
    items = items.filter((item) => Number(item.quantity) > 0);
  }
  return items;
}

export async function listInventoryPage(
  filters: {
    search?: string;
    category?: string;
    stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  },
  pagination: { limit: number; offset: number }
): Promise<{ items: InventoryItem[]; total: number }> {
  if (filters?.stockStatus) {
    const all = await getAllInventory(filters);
    const total = all.length;
    const slice = all.slice(pagination.offset, pagination.offset + pagination.limit);
    return { items: slice, total };
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("inventory_items")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });
  const safeSearch = sanitizePostgrestSearchToken(filters?.search);
  if (safeSearch) {
    query = query.or(
      `name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,supplier.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`
    );
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  const from = pagination.offset;
  const to = pagination.offset + pagination.limit - 1;
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as InventoryItem[], total: count ?? 0 };
}

export async function getInventoryById(id: string): Promise<InventoryItem | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("inventory_items").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as InventoryItem;
}

export async function createInventory(payload: CreateInventoryItemInput): Promise<InventoryItem> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("inventory_items").insert(payload).select("*").single();
  if (error) throw error;
  await addInventoryMovement({
    item_id: (data as InventoryItem).id,
    movement_type: "receive",
    quantity_delta: Number(payload.quantity ?? 0),
    reason: "Initial stock"
  });
  return data as InventoryItem;
}

export async function updateInventory(id: string, payload: UpdateInventoryItemInput): Promise<InventoryItem | null> {
  const current = await getInventoryById(id);
  if (!current) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  if (payload.quantity !== undefined && payload.quantity !== current.quantity) {
    await addInventoryMovement({
      item_id: id,
      movement_type: "adjustment",
      quantity_delta: Number(payload.quantity) - Number(current.quantity),
      reason: "Manual stock update"
    });
  }
  return data as InventoryItem;
}

export async function deleteInventory(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("inventory_items").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}

export async function getInventoryMovements(itemId?: string): Promise<InventoryMovement[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("inventory_movements").select("*").order("created_at", { ascending: false });
  if (itemId) query = query.eq("item_id", itemId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InventoryMovement[];
}

export async function listInventoryMovementsPage(
  itemId: string | undefined,
  pagination: { limit: number; offset: number }
): Promise<{ movements: InventoryMovement[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("inventory_movements")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (itemId) query = query.eq("item_id", itemId);
  const from = pagination.offset;
  const to = pagination.offset + pagination.limit - 1;
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { movements: (data ?? []) as InventoryMovement[], total: count ?? 0 };
}

export async function addInventoryMovement(payload: {
  item_id: string;
  movement_type: InventoryMovementType;
  quantity_delta: number;
  reason?: string;
  work_order_id?: string;
  created_by?: string;
}): Promise<InventoryMovement> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .insert({
      item_id: payload.item_id,
      movement_type: payload.movement_type,
      quantity_delta: payload.quantity_delta,
      reason: payload.reason ?? null,
      work_order_id: payload.work_order_id ?? null,
      created_by: payload.created_by ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as InventoryMovement;
}
