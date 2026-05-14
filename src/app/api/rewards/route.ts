import { NextRequest } from "next/server";
import { internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { rewardCreateSchema } from "@/lib/schemas/loyalty";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createReward, listRewards } from "@/modules/loyalty/loyalty.service";

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const needed = includeInactive ? "rewards.manage" : "rewards.read";
    const auth = await requirePermission(needed);
    if ("denied" in auth) return auth.denied;

    const rewards = await listRewards(includeInactive);
    return ok(rewards);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("rewards.manage");
    if ("denied" in auth) return auth.denied;

    const parsed = await parseJsonBody(request, rewardCreateSchema);
    if ("response" in parsed) return parsed.response;
    const data = parsed.data;

    const created = await createReward({
      title: data.title,
      description: data.description ?? null,
      points_required: data.points_required,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0
    });
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "reward.created",
      entityType: "loyalty_reward",
      entityId: created.id,
      workOrderId: null,
      summary: `${actor.full_name} creó la recompensa «${created.title}».`,
      metadata: { reward_id: created.id, points_required: created.points_required }
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
