import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { Client } from "@/lib/types";

/** Normaliza cédula/RUC para comparar duplicados: solo dígitos, vacío → null. */
export function normalizeCedulaDigits(input: string | null | undefined): string | null {
  if (input === undefined || input === null) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export type CreateClientInput = Omit<Client, "id" | "created_at" | "updated_at">;
export type UpdateClientInput = Partial<CreateClientInput>;

/** Solo campos de negocio del cliente; ignora id, timestamps y claves arbitrarias (mass assignment). */
export function pickClientApiPatch(raw: Record<string, unknown>): UpdateClientInput {
  const out: UpdateClientInput = {};
  if (typeof raw.full_name === "string") out.full_name = raw.full_name.trim();
  if (typeof raw.phone === "string") out.phone = raw.phone.trim();
  if (raw.email === null) out.email = null;
  else if (typeof raw.email === "string") {
    const e = raw.email.trim();
    out.email = e === "" ? null : e;
  }
  if (typeof raw.is_verified === "boolean") out.is_verified = raw.is_verified;
  if (raw.notes === null) out.notes = null;
  else if (typeof raw.notes === "string") out.notes = raw.notes;
  if (raw.cedula === null) out.cedula = null;
  else if (typeof raw.cedula === "string") {
    const c = raw.cedula.trim();
    out.cedula = c === "" ? null : c;
  }
  return out;
}

export async function getAllClients(search?: string): Promise<Client[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("clients").select("*").order("created_at", { ascending: false });
  const safeSearch = sanitizePostgrestSearchToken(search);
  if (safeSearch) {
    query = query.or(
      `full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,cedula.ilike.%${safeSearch}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Client[];
}

export async function listClientsPage(options: {
  limit: number;
  offset: number;
  search?: string;
}): Promise<{ clients: Client[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const safeSearch = sanitizePostgrestSearchToken(options.search);
  if (safeSearch) {
    query = query.or(
      `full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,cedula.ilike.%${safeSearch}%`
    );
  }
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { clients: (data ?? []) as Client[], total: count ?? 0 };
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Client;
}

export async function getClientByCedulaNorm(cedulaNorm: string): Promise<Client | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clients").select("*").eq("cedula_norm", cedulaNorm).maybeSingle();
  if (error) throw error;
  return (data as Client | null) ?? null;
}

/** Inserción directa; en API pública el alta debe ir siempre con vehículo vía `complete-registration`. */
/** Inserción directa; el alta vía API debe usar siempre `complete-registration` (cliente + vehículo). */
export async function createClient(payload: CreateClientInput): Promise<Client> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, payload: UpdateClientInput): Promise<Client | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Client;
}

/** Elimina el cliente. Falla si hay órdenes de trabajo que lo referencian (`work_orders` restrict). */
export async function deleteClient(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("clients").delete({ count: "exact" }).eq("id", id);
  if (error) {
    const code = (error as { code?: string }).code;
    const msg = typeof error.message === "string" ? error.message : "";
    if (code === "23503" || /foreign key|violates foreign key/i.test(msg)) {
      throw new Error(
        "No se puede eliminar el cliente mientras tenga órdenes de trabajo asociadas. Elimina o reasigna esas órdenes primero."
      );
    }
    throw error;
  }
  return Boolean(count && count > 0);
}
