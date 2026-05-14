import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { Notification } from "@/lib/types";

export type CreateNotificationInput = Omit<Notification, "id" | "created_at" | "is_read"> & {
  is_read?: boolean;
};

export async function getAllNotifications(unreadOnly = false): Promise<Notification[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (unreadOnly) query = query.eq("is_read", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function listNotificationsPage(options: {
  limit: number;
  offset: number;
  unreadOnly?: boolean;
  search?: string;
  /** Solo notificaciones de recompensa/canje de lealtad (operador). */
  operatorRewardNotificationsOnly?: boolean;
}): Promise<{ items: Notification[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (options.unreadOnly) query = query.eq("is_read", false);
  if (options.operatorRewardNotificationsOnly) {
    query = query.or("title.ilike.%Recompensa%,title.ilike.%Canje:%,title.ilike.%Canje de catálogo%");
  }
  const safeSearch = sanitizePostgrestSearchToken(options.search);
  if (safeSearch) {
    query = query.or(`title.ilike.%${safeSearch}%,body.ilike.%${safeSearch}%`);
  }
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as Notification[], total: count ?? 0 };
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("notifications").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Notification;
}

export async function createNotification(payload: CreateNotificationInput): Promise<Notification> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("notifications").insert(payload).select("*").single();
  if (error) throw error;
  return data as Notification;
}

export async function updateNotification(
  id: string,
  payload: Partial<CreateNotificationInput>
): Promise<Notification | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Notification;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("notifications").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}
