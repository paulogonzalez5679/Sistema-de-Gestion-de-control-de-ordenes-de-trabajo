import { requirePermission } from "@/lib/permissions";
import { internalError, ok } from "@/lib/api-response";
import { deleteAllAuditEvents } from "@/modules/audit/audit.service";

export const runtime = "nodejs";

/** Vacía la tabla `audit_events` (solo administrador). Sin automatización: acción manual. */
export async function POST() {
  try {
    const auth = await requirePermission("audit.purge");
    if ("denied" in auth) return auth.denied;

    const deleted = await deleteAllAuditEvents();
    return ok({ success: true, deleted_rows: deleted });
  } catch (error) {
    return internalError(error);
  }
}
