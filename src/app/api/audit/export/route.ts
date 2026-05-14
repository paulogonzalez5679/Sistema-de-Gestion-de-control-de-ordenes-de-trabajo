import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { internalError } from "@/lib/api-response";
import { buildAuditPdfBuffer } from "@/modules/audit/audit-pdf";
import { enrichAuditEventsWithActorNames, fetchAllAuditEventsForExport } from "@/modules/audit/audit.service";

export const runtime = "nodejs";

/**
 * Descarga PDF con todo el historial de auditoría actual. No borra filas en base de datos.
 */
export async function GET() {
  try {
    const auth = await requirePermission("audit.export");
    if ("denied" in auth) return auth.denied;

    const events = await fetchAllAuditEventsForExport();
    const rows = await enrichAuditEventsWithActorNames(events);
    const buf = await buildAuditPdfBuffer(rows, "Informe de auditoría (exportación manual)");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="auditoria-${stamp}.pdf"`
      }
    });
  } catch (error) {
    return internalError(error);
  }
}
