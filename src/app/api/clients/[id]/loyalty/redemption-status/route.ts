import { internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { getRedemptionSummary } from "@/modules/loyalty/loyalty.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const auth = await requirePermission("loyalty.read_status");
    if ("denied" in auth) return auth.denied;

    const { id: clientId } = await params;
    const summary = await getRedemptionSummary(clientId);
    return ok(summary);
  } catch (error) {
    return internalError(error);
  }
}
