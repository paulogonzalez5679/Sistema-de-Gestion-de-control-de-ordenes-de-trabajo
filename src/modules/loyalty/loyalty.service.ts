import { LOYALTY_MAX_POINTS } from "@/lib/loyalty-constants";
import { canUseDailyRedemption } from "@/lib/loyalty-calendar";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type {
  ClientLoyalty,
  ClientRedemptionStatus,
  LoyaltyPointEvent,
  LoyaltyPointReason,
  LoyaltyReward,
  WorkOrder
} from "@/lib/types";

/** Suma `reward_points` de cada servicio incluido en la orden (work_order_services → services). */
export async function sumRewardPointsForWorkOrder(workOrderId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_services")
    .select("services(reward_points)")
    .eq("work_order_id", workOrderId);
  if (error) throw error;
  let sum = 0;
  for (const row of data ?? []) {
    const svc = row.services as { reward_points?: number } | null;
    if (svc && typeof svc.reward_points === "number") sum += svc.reward_points;
  }
  return sum;
}

export async function awardPointsForCompletedOrder(order: WorkOrder): Promise<boolean> {
  const pts = await sumRewardPointsForWorkOrder(order.id);
  if (pts <= 0) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("apply_loyalty_points", {
    p_client_id: order.client_id,
    p_points_delta: pts,
    p_reason: "order_completed" satisfies LoyaltyPointReason,
    p_idempotency_key: `order_completed:${order.id}`,
    p_work_order_id: order.id,
    p_appointment_id: null,
    p_metadata: {
      order_number: order.order_number,
      total_reward_points: pts
    }
  });

  if (error) throw error;
  return Boolean(data);
}

export type RedeemFreeServiceResult =
  | { ok: true; previous_balance: number }
  | { ok: false; reason: string };

export async function redeemFreeService(clientId: string): Promise<RedeemFreeServiceResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("redeem_loyalty_free_service", {
    p_client_id: clientId
  });
  if (error) throw error;
  const row = data as { ok?: boolean; reason?: string; previous_balance?: number } | null;
  if (row?.ok) {
    return { ok: true, previous_balance: Number(row.previous_balance ?? LOYALTY_MAX_POINTS) };
  }
  return { ok: false, reason: typeof row?.reason === "string" ? row.reason : "unknown" };
}

export type RedeemCatalogRewardResult = { ok: true } | { ok: false; reason: string };

export async function redeemCatalogReward(clientId: string, rewardId: string): Promise<RedeemCatalogRewardResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("redeem_loyalty_catalog_reward", {
    p_client_id: clientId,
    p_reward_id: rewardId
  });
  if (error) throw error;
  const row = data as { ok?: boolean; reason?: string } | null;
  if (row?.ok) return { ok: true };
  return { ok: false, reason: typeof row?.reason === "string" ? row.reason : "unknown" };
}

export async function getClientLoyalty(clientId: string): Promise<ClientLoyalty | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("client_loyalty").select("*").eq("client_id", clientId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  return {
    client_id: raw.client_id as string,
    points: Number(raw.points ?? 0),
    last_redemption_at: (raw.last_redemption_at as string | undefined) ?? null,
    updated_at: raw.updated_at as string
  };
}

export async function listLoyaltyEvents(clientId: string, limit = 25): Promise<LoyaltyPointEvent[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("loyalty_point_events")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LoyaltyPointEvent[];
}

export async function listLoyaltyEventsPage(
  clientId: string,
  options: { limit: number; offset: number }
): Promise<{ events: LoyaltyPointEvent[]; total: number }> {
  const supabase = createSupabaseAdminClient();
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  const { data, error, count } = await supabase
    .from("loyalty_point_events")
    .select("*", { count: "exact" })
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { events: (data ?? []) as LoyaltyPointEvent[], total: count ?? 0 };
}

export async function listRewards(includeInactive = false): Promise<LoyaltyReward[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("loyalty_rewards").select("*").order("sort_order", { ascending: true }).order("points_required", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LoyaltyReward[];
}

export async function getRedemptionSummary(clientId: string): Promise<ClientRedemptionStatus> {
  const loyalty = await getClientLoyalty(clientId);
  const balance = loyalty?.points ?? 0;
  const lastRedemptionAt = loyalty?.last_redemption_at ?? null;
  const canRedeemToday = canUseDailyRedemption(lastRedemptionAt);

  const rewards = await listRewards(false);
  const supabase = createSupabaseAdminClient();
  const { data: claimedRows, error: claimedErr } = await supabase
    .from("loyalty_reward_redemptions")
    .select("reward_id")
    .eq("client_id", clientId);
  if (claimedErr) throw claimedErr;

  const claimed = new Set((claimedRows ?? []).map((r: { reward_id: string }) => r.reward_id));

  const redeemableCatalog = rewards
    .filter((r) => balance >= r.points_required && !claimed.has(r.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.points_required - b.points_required);

  let pendingModal: ClientRedemptionStatus["pendingModal"] = null;
  if (canRedeemToday) {
    if (balance >= LOYALTY_MAX_POINTS) {
      pendingModal = { kind: "free_service" };
    } else if (redeemableCatalog.length > 0) {
      pendingModal = { kind: "catalog", reward: redeemableCatalog[0] };
    }
  }

  return {
    balance,
    lastRedemptionAt,
    canRedeemToday,
    redeemableCatalog,
    pendingModal
  };
}

export async function getRewardById(id: string): Promise<LoyaltyReward | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("loyalty_rewards").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as LoyaltyReward | null) ?? null;
}

export type CreateRewardInput = Pick<LoyaltyReward, "title" | "description" | "points_required" | "is_active" | "sort_order">;

export async function createReward(payload: CreateRewardInput): Promise<LoyaltyReward> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      points_required: payload.points_required,
      is_active: payload.is_active,
      sort_order: payload.sort_order
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LoyaltyReward;
}

export type UpdateRewardInput = Partial<CreateRewardInput>;

export async function updateReward(id: string, payload: UpdateRewardInput): Promise<LoyaltyReward | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("loyalty_rewards").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return (data as LoyaltyReward | null) ?? null;
}

export async function deleteReward(id: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase.from("loyalty_rewards").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  return Boolean(count && count > 0);
}
