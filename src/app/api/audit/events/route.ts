import { NextRequest } from "next/server";
import { internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { enrichAuditEventsWithActorNames, listAuditEventsWithTotal } from "@/modules/audit/audit.service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("audit.read");
    if ("denied" in auth) return auth.denied;

    const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "150") || 150));
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? "0") || 0);
    const { events, total } = await listAuditEventsWithTotal({ limit, offset });
    const enriched = await enrichAuditEventsWithActorNames(events);
    return ok({ events: enriched, total, limit, offset });
  } catch (error) {
    return internalError(error);
  }
}
