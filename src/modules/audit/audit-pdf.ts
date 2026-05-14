import type { AuditEvent } from "@/lib/types";
import PDFDocument from "pdfkit";

export type AuditPdfRow = AuditEvent & { actor_name?: string | null };

/**
 * Genera un PDF en memoria con el listado de eventos de auditoría (texto plano por fila).
 */
export function buildAuditPdfBuffer(rows: AuditPdfRow[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).fillColor("#1a0a2e").text(title, { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(9).fillColor("#333333");
    doc.text(`Generado: ${new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "medium" })}`);
    doc.text(`Total de eventos: ${rows.length}`);
    doc.moveDown(1);

    const pageBottom = 780;

    for (const row of rows) {
      const who = row.actor_name ?? row.actor_id ?? "—";
      const meta = row.metadata ? JSON.stringify(row.metadata).slice(0, 120) : "";
      const block = [
        `${row.created_at}  ·  ${row.action}`,
        `Actor: ${who}`,
        row.summary,
        row.entity_type ? `Entidad: ${row.entity_type} ${row.entity_id ?? ""}` : "",
        meta ? `Meta: ${meta}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      if (doc.y > pageBottom) doc.addPage();
      doc.text(block, { width: 500, lineGap: 2 });
      doc.moveDown(0.35);
    }

    doc.end();
  });
}
