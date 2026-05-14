import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { createNotification } from "@/modules/notifications/notification.service";

async function clientName(clientId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("clients").select("full_name").eq("id", clientId).maybeSingle();
  return data?.full_name ?? clientId;
}

/** Puntos ganados al completar una orden (recompensa de fidelización). */
export async function notifyClientEarnedLoyaltyPoints(args: {
  clientId: string;
  orderNumber: string;
  points: number;
}): Promise<void> {
  try {
    if (args.points <= 0) return;
    const name = await clientName(args.clientId);
    await createNotification({
      title: `Recompensa: ${name} ganó ${args.points} puntos`,
      body: `Por completar la orden ${args.orderNumber}, el cliente acumuló ${args.points} punto(s) de fidelización.`,
      severity: "success",
      user_id: null,
      work_order_id: null,
      is_read: false
    });
  } catch (e) {
    console.error("notifyClientEarnedLoyaltyPoints:", e);
  }
}

export async function notifyFreeServiceRedeemed(args: {
  clientId: string;
  actorName: string;
  previousBalance: number;
}): Promise<void> {
  try {
    const name = await clientName(args.clientId);
    await createNotification({
      title: `Canje: servicio gratis — ${name}`,
      body: `${args.actorName} canjeó el servicio gratis (500 pts). Saldo anterior: ${args.previousBalance} → 0.`,
      severity: "success",
      user_id: null,
      work_order_id: null,
      is_read: false
    });
  } catch (e) {
    console.error("notifyFreeServiceRedeemed:", e);
  }
}

export async function notifyCatalogRewardRedeemed(args: {
  clientId: string;
  actorName: string;
  rewardTitle: string;
}): Promise<void> {
  try {
    const name = await clientName(args.clientId);
    await createNotification({
      title: `Canje de catálogo — ${name}`,
      body: `${args.actorName} canjeó la recompensa «${args.rewardTitle}».`,
      severity: "success",
      user_id: null,
      work_order_id: null,
      is_read: false
    });
  } catch (e) {
    console.error("notifyCatalogRewardRedeemed:", e);
  }
}
