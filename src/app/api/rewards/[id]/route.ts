import { NextRequest } from "next/server";
import { internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { rewardUpdateSchema } from "@/lib/schemas/loyalty";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { deleteReward, getRewardById, updateReward } from "@/modules/loyalty/loyalty.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("rewards.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const reward = await getRewardById(id);
    if (!reward) return notFound("Reward");
    return ok(reward);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("rewards.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const parsed = await parseJsonBody(request, rewardUpdateSchema);
    if ("response" in parsed) return parsed.response;
    if (Object.keys(parsed.data).length === 0) {
      return new Response(JSON.stringify({ error: "No fields to update" }), { status: 400 });
    }
    const updated = await updateReward(id, parsed.data);
    if (!updated) return notFound("Reward");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "reward.updated",
      entityType: "loyalty_reward",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} actualizó la recompensa «${updated.title}».`,
      metadata: { reward_id: id }
    });
    return ok(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, ctx: Params) {
  return PATCH(request, ctx);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("rewards.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const before = await getRewardById(id);
    const removed = await deleteReward(id);
    if (!removed) return notFound("Reward");
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "reward.deleted",
      entityType: "loyalty_reward",
      entityId: id,
      workOrderId: null,
      summary: `${actor.full_name} eliminó la recompensa «${before?.title ?? id}».`,
      metadata: { reward_id: id }
    });
    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
