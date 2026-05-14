import { internalError, ok, badRequest } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { catalogRedeemSchema } from "@/lib/schemas/loyalty";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { redeemCatalogReward, getRewardById } from "@/modules/loyalty/loyalty.service";
import { notifyCatalogRewardRedeemed } from "@/modules/notifications/loyalty-events";
import { recordAuditEvent } from "@/modules/audit/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requirePermission("loyalty.redeem_catalog");
    if ("denied" in auth) return auth.denied;
    const profile = auth.profile;

    const { id: clientId } = await params;
    const parsed = await parseJsonBody(request, catalogRedeemSchema);
    if ("response" in parsed) return parsed.response;

    const result = await redeemCatalogReward(clientId, parsed.data.rewardId);

    if (!result.ok) {
      const messages: Record<string, string> = {
        daily_limit: "Ya usaste tu canje del día (incluye servicio gratis). Vuelve mañana.",
        insufficient_points: "No tienes puntos suficientes para esta recompensa.",
        reward_not_found: "Recompensa no encontrada.",
        reward_inactive: "Esta recompensa ya no está activa.",
        already_redeemed: "Esta recompensa ya fue canjeada.",
        unknown: "No se pudo completar el canje."
      };
      return badRequest(messages[result.reason] ?? messages.unknown);
    }

    const reward = await getRewardById(parsed.data.rewardId);
    await recordAuditEvent({
      actorId: profile.id,
      action: "loyalty.redeem_catalog",
      entityType: "client",
      entityId: clientId,
      workOrderId: null,
      summary: `${profile.full_name} canjeó recompensa de catálogo «${reward?.title ?? parsed.data.rewardId}».`,
      metadata: { client_id: clientId, reward_id: parsed.data.rewardId }
    });
    await notifyCatalogRewardRedeemed({
      clientId,
      actorName: profile.full_name,
      rewardTitle: reward?.title ?? "Recompensa"
    });

    return ok({ success: true, message: "Recompensa registrada." });
  } catch (error) {
    return internalError(error);
  }
}
