import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Profile;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function listProfilesPage(options: {
  limit: number;
  offset: number;
  search?: string;
}): Promise<{ profiles: Profile[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  let query = supabase.from("profiles").select("*", { count: "exact" }).order("full_name", { ascending: true });
  const safeSearch = sanitizePostgrestSearchToken(options.search);
  if (safeSearch) {
    const like = `%${safeSearch}%`;
    query = query.or(`full_name.ilike.${like},role.ilike.${like}`);
  }
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { profiles: (data ?? []) as Profile[], total: count ?? 0 };
}
