import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { addInventoryMovement } from "@/modules/inventory/inventory.service";
import type {
  Appointment,
  Client,
  OrderImage,
  Vehicle,
  WorkOrder,
  WorkOrderProduct,
  WorkOrderService,
  WorkOrderStatus,
  WorkOrderUpdate
} from "@/lib/types";

export type CreateWorkOrderInput = Omit<
  WorkOrder,
  "id" | "created_at" | "updated_at" | "total_amount" | "check_in_at" | "completed_at" | "discount_amount"
> & {
  total_amount?: number;
  discount_amount?: number;
  check_in_at?: string | null;
  completed_at?: string | null;
};

export type UpdateWorkOrderInput = Partial<CreateWorkOrderInput>;

/** Evita mass assignment: solo columnas mutables por la API (no totales ni identidad de la orden). */
const WORK_ORDER_API_PATCH_KEYS = [
  "status",
  "priority",
  "assigned_to",
  "client_id",
  "vehicle_id",
  "scheduled_start",
  "scheduled_end",
  "check_in_at",
  "completed_at",
  "notes"
] as const satisfies readonly (keyof WorkOrder)[];

export function pickWorkOrderApiPatch(raw: Record<string, unknown>): UpdateWorkOrderInput {
  const out: UpdateWorkOrderInput = {};
  for (const key of WORK_ORDER_API_PATCH_KEYS) {
    if (raw[key] === undefined) continue;
    (out as Record<string, unknown>)[key] = raw[key];
  }
  return out;
}

const WORK_ORDER_REL_SEARCH_LIMIT = 80;

/** Incluye cliente y vehículo (matrícula, marca, modelo) en el OR de PostgREST. */
async function workOrderSearchOrClause(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  safeSearch: string
): Promise<string> {
  const like = `%${safeSearch}%`;
  const parts: string[] = [`order_number.ilike.${like}`, `notes.ilike.${like}`];
  const [{ data: cRows }, { data: vRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like},cedula.ilike.${like}`)
      .limit(WORK_ORDER_REL_SEARCH_LIMIT),
    supabase
      .from("vehicles")
      .select("id")
      .or(`plate.ilike.${like},make.ilike.${like},model.ilike.${like}`)
      .limit(WORK_ORDER_REL_SEARCH_LIMIT)
  ]);
  const cids = [...new Set((cRows ?? []).map((r) => r.id))];
  const vids = [...new Set((vRows ?? []).map((r) => r.id))];
  if (cids.length) parts.push(`client_id.in.(${cids.join(",")})`);
  if (vids.length) parts.push(`vehicle_id.in.(${vids.join(",")})`);
  return parts.join(",");
}

export async function getAllOrders(
  search?: string,
  status?: WorkOrderStatus,
  options?: { assigneeUserId?: string }
): Promise<WorkOrder[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("work_orders").select("*").order("created_at", { ascending: false });
  if (options?.assigneeUserId) {
    query = query.eq("assigned_to", options.assigneeUserId);
  }
  if (status) query = query.eq("status", status);
  const safeSearch = sanitizePostgrestSearchToken(search);
  if (safeSearch) {
    const orClause = await workOrderSearchOrClause(supabase, safeSearch);
    query = query.or(orClause);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as WorkOrder[];
}

export async function getWorkOrdersPage(options: {
  limit: number;
  offset: number;
  search?: string;
  status?: WorkOrderStatus;
  assigneeUserId?: string;
}): Promise<{ orders: WorkOrder[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("work_orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (options.assigneeUserId) {
    query = query.eq("assigned_to", options.assigneeUserId);
  }
  if (options.status) query = query.eq("status", options.status);
  const safeSearch = sanitizePostgrestSearchToken(options.search);
  if (safeSearch) {
    const orClause = await workOrderSearchOrClause(supabase, safeSearch);
    query = query.or(orClause);
  }
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: (data ?? []) as WorkOrder[], total: count ?? 0 };
}

/** Listado de órdenes con etiquetas de cliente, vehículo y técnico asignado (para tabla admin). */
export type WorkOrderListEnriched = WorkOrder & {
  client_name: string | null;
  vehicle_label: string;
  assignee_name: string | null;
};

async function enrichWorkOrdersForList(orders: WorkOrder[]): Promise<WorkOrderListEnriched[]> {
  if (orders.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const clientIds = [...new Set(orders.map((o) => o.client_id))];
  const vehicleIds = [...new Set(orders.map((o) => o.vehicle_id))];
  const assigneeIds = [...new Set(orders.map((o) => o.assigned_to).filter((id): id is string => Boolean(id)))];

  const [{ data: clientsRows }, { data: vehiclesRows }] = await Promise.all([
    supabase.from("clients").select("id, full_name").in("id", clientIds),
    supabase.from("vehicles").select("id, make, model, plate").in("id", vehicleIds)
  ]);

  let profilesRows: { id: string; full_name: string }[] = [];
  if (assigneeIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", assigneeIds);
    profilesRows = data ?? [];
  }

  const cMap = new Map((clientsRows ?? []).map((c) => [c.id, c.full_name as string]));
  const vMap = new Map(
    (vehiclesRows ?? []).map((v) => [v.id, `${v.make} ${v.model} · ${v.plate}`])
  );
  const pMap = new Map(profilesRows.map((p) => [p.id, p.full_name]));

  return orders.map((o) => ({
    ...o,
    client_name: cMap.get(o.client_id) ?? null,
    vehicle_label: vMap.get(o.vehicle_id) ?? "—",
    assignee_name: o.assigned_to ? pMap.get(o.assigned_to) ?? null : null
  }));
}

export async function getAllOrdersEnriched(): Promise<WorkOrderListEnriched[]> {
  const orders = await getAllOrders();
  return enrichWorkOrdersForList(orders);
}

export async function getOrdersEnrichedPage(options: {
  limit: number;
  offset: number;
  search?: string;
  status?: WorkOrderStatus;
  assigneeUserId?: string;
}): Promise<{ rows: WorkOrderListEnriched[]; total: number }> {
  const { orders, total } = await getWorkOrdersPage(options);
  const rows = await enrichWorkOrdersForList(orders);
  return { rows, total };
}

export async function getOrderById(id: string): Promise<WorkOrder | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("work_orders").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkOrder;
}

export async function createOrder(payload: CreateWorkOrderInput): Promise<WorkOrder> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("work_orders").insert(payload).select("*").single();
  if (error) throw error;
  return data as WorkOrder;
}

export async function updateOrder(id: string, payload: UpdateWorkOrderInput): Promise<WorkOrder | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("work_orders").update(payload).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkOrder;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("work_orders").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}

export async function setOrderServices(
  workOrderId: string,
  items: Array<{ service_id: string; price: number }>
): Promise<WorkOrderService[]> {
  if (!items.length) {
    throw new Error("Se requiere al menos un servicio por orden.");
  }
  const supabase = createSupabaseAdminClient();
  await supabase.from("work_order_services").delete().eq("work_order_id", workOrderId);
  const payload = items.map((item) => ({
    work_order_id: workOrderId,
    service_id: item.service_id,
    price: item.price,
    status: "pending" as const
  }));
  const { data, error } = await supabase.from("work_order_services").insert(payload).select("*");
  if (error) throw error;
  await recomputeOrderTotal(workOrderId);
  return (data ?? []) as WorkOrderService[];
}

/**
 * Recalcula `total_amount` = sum(servicios) + sum(productos * cantidad) - discount_amount (mínimo 0).
 * Devuelve el total resultante. Pensado para llamarse tras cualquier cambio en líneas o descuento.
 */
export async function recomputeOrderTotal(workOrderId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const [{ data: services }, { data: products }, { data: order }] = await Promise.all([
    supabase.from("work_order_services").select("price").eq("work_order_id", workOrderId),
    supabase.from("work_order_products").select("quantity, unit_price").eq("work_order_id", workOrderId),
    supabase.from("work_orders").select("discount_amount").eq("id", workOrderId).single()
  ]);

  const servicesSum = (services ?? []).reduce((acc, row) => acc + Number(row.price ?? 0), 0);
  const productsSum = (products ?? []).reduce(
    (acc, row) => acc + Number(row.quantity ?? 0) * Number(row.unit_price ?? 0),
    0
  );
  const discount = Number(order?.discount_amount ?? 0);
  const total = Math.max(0, Number((servicesSum + productsSum - discount).toFixed(2)));

  await supabase.from("work_orders").update({ total_amount: total }).eq("id", workOrderId);
  return total;
}

export async function getOrderProducts(workOrderId: string): Promise<WorkOrderProduct[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_products")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkOrderProduct[];
}

export type OrderProductLineEnriched = WorkOrderProduct & {
  item_name: string;
  item_sku: string;
  line_total: number;
};

export async function getOrderProductsEnriched(workOrderId: string): Promise<OrderProductLineEnriched[]> {
  const lines = await getOrderProducts(workOrderId);
  if (lines.length === 0) return [];
  const supabase = createSupabaseAdminClient();
  const itemIds = [...new Set(lines.map((line) => line.item_id))];
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, sku")
    .in("id", itemIds);
  const map = new Map((items ?? []).map((row) => [row.id as string, row]));
  return lines.map((line) => {
    const item = map.get(line.item_id);
    return {
      ...line,
      item_name: item?.name ?? "Producto eliminado",
      item_sku: item?.sku ?? "—",
      line_total: Number(line.quantity) * Number(line.unit_price)
    };
  });
}

/**
 * Añade un producto a la orden, descuenta stock y registra el movimiento de inventario.
 * Lanza error si el inventario no tiene cantidad suficiente.
 */
export async function addOrderProduct(args: {
  workOrderId: string;
  itemId: string;
  quantity: number;
  unitPrice?: number;
  actorId?: string | null;
}): Promise<WorkOrderProduct> {
  if (args.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor a cero.");
  }
  const supabase = createSupabaseAdminClient();

  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .select("id, name, quantity, unit_cost")
    .eq("id", args.itemId)
    .single();
  if (itemError || !item) {
    throw new Error("El producto seleccionado no existe.");
  }
  if (Number(item.quantity) < args.quantity) {
    throw new Error(`Stock insuficiente para «${item.name}». Disponible: ${item.quantity}.`);
  }

  const unitPrice = args.unitPrice ?? Number(item.unit_cost ?? 0);

  const { data: inserted, error: insertError } = await supabase
    .from("work_order_products")
    .insert({
      work_order_id: args.workOrderId,
      item_id: args.itemId,
      quantity: args.quantity,
      unit_price: unitPrice
    })
    .select("*")
    .single();
  if (insertError) throw insertError;

  await supabase
    .from("inventory_items")
    .update({ quantity: Number(item.quantity) - args.quantity })
    .eq("id", args.itemId);

  await addInventoryMovement({
    item_id: args.itemId,
    movement_type: "issue",
    quantity_delta: -args.quantity,
    reason: "Consumo en orden de trabajo",
    work_order_id: args.workOrderId,
    created_by: args.actorId ?? undefined
  });

  await recomputeOrderTotal(args.workOrderId);
  return inserted as WorkOrderProduct;
}

/**
 * Elimina un producto de la orden, devuelve el stock y registra el movimiento.
 */
export async function removeOrderProduct(args: {
  workOrderId: string;
  lineId: string;
  actorId?: string | null;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data: line, error: lineError } = await supabase
    .from("work_order_products")
    .select("*")
    .eq("id", args.lineId)
    .eq("work_order_id", args.workOrderId)
    .single();
  if (lineError || !line) return false;

  const { data: item } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", line.item_id)
    .single();

  const { error: deleteError } = await supabase
    .from("work_order_products")
    .delete()
    .eq("id", args.lineId);
  if (deleteError) throw deleteError;

  if (item) {
    await supabase
      .from("inventory_items")
      .update({ quantity: Number(item.quantity) + Number(line.quantity) })
      .eq("id", line.item_id);
    await addInventoryMovement({
      item_id: line.item_id,
      movement_type: "adjustment",
      quantity_delta: Number(line.quantity),
      reason: "Producto retirado de la orden",
      work_order_id: args.workOrderId,
      created_by: args.actorId ?? undefined
    });
  }

  await recomputeOrderTotal(args.workOrderId);
  return true;
}

/**
 * Actualiza el descuento aplicado a la orden y recalcula el total.
 */
export async function setOrderDiscount(workOrderId: string, discount: number): Promise<number> {
  const value = Math.max(0, Number(discount) || 0);
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("work_orders")
    .update({ discount_amount: Number(value.toFixed(2)) })
    .eq("id", workOrderId);
  return recomputeOrderTotal(workOrderId);
}

export async function getOrderServices(workOrderId: string): Promise<WorkOrderService[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_services")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkOrderService[];
}

export async function addOrderUpdate(
  payload: Omit<WorkOrderUpdate, "id" | "created_at">
): Promise<WorkOrderUpdate> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("work_order_updates").insert(payload).select("*").single();
  if (error) throw error;
  return data as WorkOrderUpdate;
}

export async function getOrderUpdates(workOrderId: string): Promise<WorkOrderUpdate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_updates")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkOrderUpdate[];
}

export async function getOrderUpdatesPage(
  workOrderId: string,
  options: { limit: number; offset: number }
): Promise<{ updates: WorkOrderUpdate[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  const { data, error, count } = await supabase
    .from("work_order_updates")
    .select("*", { count: "exact" })
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { updates: (data ?? []) as WorkOrderUpdate[], total: count ?? 0 };
}

export async function addOrderImage(payload: Omit<OrderImage, "id" | "created_at">): Promise<OrderImage> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("order_images").insert(payload).select("*").single();
  if (error) throw error;
  return data as OrderImage;
}

export async function getOrderImages(workOrderId: string): Promise<OrderImage[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_images")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderImage[];
}

export async function getOrderImagesPage(
  workOrderId: string,
  options: { limit: number; offset: number }
): Promise<{ images: OrderImage[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  const { data, error, count } = await supabase
    .from("order_images")
    .select("*", { count: "exact" })
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { images: (data ?? []) as OrderImage[], total: count ?? 0 };
}

/** Si existe cita vinculada a la orden, actualiza inicio/fin para alinear con la orden. */
export async function syncAppointmentWithOrderSchedule(
  workOrderId: string,
  startsAt: string,
  endsAt: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("appointments").select("id").eq("work_order_id", workOrderId).maybeSingle();
  if (!data?.id) return;
  const { error } = await supabase
    .from("appointments")
    .update({ starts_at: startsAt, ends_at: endsAt })
    .eq("id", data.id);
  if (error) throw error;
}

export async function createOrUpdateAppointment(
  payload: Omit<Appointment, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<Appointment> {
  const supabase = createSupabaseAdminClient();
  if (payload.id) {
    const { data, error } = await supabase
      .from("appointments")
      .update({
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
        bay: payload.bay
      })
      .eq("id", payload.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Appointment;
  }
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      work_order_id: payload.work_order_id,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      bay: payload.bay
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function listAppointments(
  startISO?: string,
  endISO?: string,
  options?: { assigneeUserId?: string }
): Promise<Appointment[]> {
  const supabase = createSupabaseAdminClient();

  let workOrderIds: string[] | null = null;
  if (options?.assigneeUserId) {
    const { data: rows, error: woErr } = await supabase
      .from("work_orders")
      .select("id")
      .eq("assigned_to", options.assigneeUserId);
    if (woErr) throw woErr;
    workOrderIds = (rows ?? []).map((r) => r.id as string);
    if (workOrderIds.length === 0) return [];
  }

  let query = supabase.from("appointments").select("*").order("starts_at", { ascending: true });
  if (workOrderIds) {
    query = query.in("work_order_id", workOrderIds);
  }
  /** Solapamiento con [startISO, endISO) cuando ambos vienen informados (vista calendario). */
  if (startISO && endISO) {
    query = query.gt("ends_at", startISO).lt("starts_at", endISO);
  } else {
    if (startISO) query = query.gte("starts_at", startISO);
    if (endISO) query = query.lte("ends_at", endISO);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export type AppointmentEnrichedDetail = {
  appointment: Appointment;
  order: WorkOrder | null;
  client: Client | null;
  vehicle: Vehicle | null;
  orderServices: WorkOrderService[];
};

export async function getAppointmentEnriched(id: string): Promise<AppointmentEnrichedDetail | null> {
  const supabase = createSupabaseAdminClient();
  const { data: appointment, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
  if (error || !appointment) return null;

  const { data: order } = await supabase.from("work_orders").select("*").eq("id", appointment.work_order_id).maybeSingle();
  if (!order) {
    return {
      appointment: appointment as Appointment,
      order: null,
      client: null,
      vehicle: null,
      orderServices: []
    };
  }

  const [{ data: client }, { data: vehicle }, { data: orderServices }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", order.client_id).maybeSingle(),
    supabase.from("vehicles").select("*").eq("id", order.vehicle_id).maybeSingle(),
    supabase.from("work_order_services").select("*").eq("work_order_id", order.id).order("created_at", { ascending: true })
  ]);

  return {
    appointment: appointment as Appointment,
    order: order as WorkOrder,
    client: (client ?? null) as Client | null,
    vehicle: (vehicle ?? null) as Vehicle | null,
    orderServices: (orderServices ?? []) as WorkOrderService[]
  };
}
