import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { Vehicle } from "@/lib/types";

export type CreateVehicleInput = Omit<Vehicle, "id" | "created_at" | "updated_at">;
export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export async function getAllVehicles(clientId?: string): Promise<Vehicle[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("vehicles").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Vehicle[];
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Vehicle;
}

export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .ilike("plate", plate.trim())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Vehicle | null) ?? null;
}

export async function createVehicle(payload: CreateVehicleInput): Promise<Vehicle> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("vehicles").insert(payload).select("*").single();
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, payload: UpdateVehicleInput): Promise<Vehicle | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("vehicles").update(payload).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("vehicles").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}
