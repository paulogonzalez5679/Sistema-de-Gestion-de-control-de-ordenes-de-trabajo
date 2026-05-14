import { internalError, ok, badRequest } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { redeemFreeService } from "@/modules/loyalty/loyalty.service";
import { notifyFreeServiceRedeemed } from "@/modules/notifications/loyalty-events";
import { recordAuditEvent } from "@/modules/audit/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const auth = await requirePermission("loyalty.redeem_free_service");
    if ("denied" in auth) return auth.denied;
    const profile = auth.profile;

    const { id: clientId } = await params;
    const result = await redeemFreeService(clientId);

    if (!result.ok) {
      if (result.reason === "need_500") {
        return badRequest("Se requieren al menos 500 puntos para canjear el servicio gratis.");
      }
      if (result.reason === "daily_limit") {
        return badRequest("Ya usaste tu canje del día (catálogo o servicio gratis). Vuelve mañana.");
      }
      return badRequest("No se pudo completar el canje.");
    }

    await recordAuditEvent({
      actorId: profile.id,
      action: "loyalty.redeem_free_service",
      entityType: "client",
      entityId: clientId,
      workOrderId: null,
      summary: `${profile.full_name} canjeó servicio gratis (cliente ${clientId}).`,
      metadata: { client_id: clientId, previous_balance: result.previous_balance }
    });
    await notifyFreeServiceRedeemed({
      clientId,
      actorName: profile.full_name,
      previousBalance: result.previous_balance
    });

    return ok({
      success: true,
      previous_balance: result.previous_balance,
      message: "Canje registrado: servicio gratis. Saldo reiniciado a 0."
    });
  } catch (error) {
    return internalError(error);
  }
}
