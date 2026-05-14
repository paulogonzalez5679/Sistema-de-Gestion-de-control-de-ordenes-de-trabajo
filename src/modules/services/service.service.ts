import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { Service } from "@/lib/types";

export type CreateServiceInput = Omit<Service, "id" | "created_at" | "updated_at">;
export type UpdateServiceInput = Partial<CreateServiceInput>;

export async function getAllServices(activeOnly = true): Promise<Service[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("services").select("*").order("name", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Service[];
}

/** Búsqueda breve para autocompletado / panel (nombre o descripción). */
export async function listServicesMatching(search: string, limit: number): Promise<Pick<Service, "id" | "name">[]> {
  const safe = sanitizePostgrestSearchToken(search);
  if (!safe) return [];
  const supabase = createSupabaseAdminClient();
  const like = `%${safe}%`;
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .or(`name.ilike.${like},description.ilike.${like}`)
    .order("name", { ascending: true })
    .limit(Math.min(50, Math.max(1, limit)));
  if (error) throw error;
  return (data ?? []) as Pick<Service, "id" | "name">[];
}

export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Service;
}

export async function createService(payload: CreateServiceInput): Promise<Service> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("services").insert(payload).select("*").single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(id: string, payload: UpdateServiceInput): Promise<Service | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("services").update(payload).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Service;
}

export async function deleteService(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("services").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}
