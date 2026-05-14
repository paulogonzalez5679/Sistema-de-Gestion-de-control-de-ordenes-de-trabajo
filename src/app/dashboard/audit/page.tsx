import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditPdfExportButton } from "@/components/audit-pdf-export-button";
import { AuditPurgeButton } from "@/components/audit-purge-button";
import { AuditListPagination } from "@/components/audit-list-pagination";
import { formatDateTime } from "@/lib/ui-labels";
import { AUDIT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { enrichAuditEventsWithActorNames, listAuditEventsWithTotal } from "@/modules/audit/audit.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditLogPage({ searchParams }: Props) {
  const session = await getSessionProfile();
  if (!canManageUsers(session?.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const pageSize = AUDIT_LIST_PAGE_SIZE;
  const offset = offsetForPage(page, pageSize);
  const { events, total } = await listAuditEventsWithTotal({ limit: pageSize, offset });
  const rows = await enrichAuditEventsWithActorNames(events);

  return (
    <div className="audit-page">
      <div className="audit-page-head">
        <div>
          <h1 style={{ margin: 0 }}>Auditoría</h1>
          <p className="audit-page-sub">
            Registro de altas y cambios (clientes, usuarios, órdenes, inventario, servicios, recompensas, fidelización),
            ciclo operativo de órdenes (estados, reasignaciones) y actividad en detalle de orden (vistas, notas, fotos).
          </p>
          <AuditPdfExportButton />
          <AuditPurgeButton />
          <p style={{ color: "#8a7aa3", fontSize: "0.82rem", marginTop: 10, maxWidth: 720, lineHeight: 1.45 }}>
            Exporta el PDF cuando lo necesites; no hay tareas programadas en el servidor. Para liberar espacio en la base
            (plan gratuito), usa «Vaciar auditoría» solo después de haber descargado el PDF si quieres conservar el
            historial.
          </p>
        </div>
        <Link className="button secondary" href="/dashboard">
          Volver al panel
        </Link>
      </div>

      <div id="audit-list-top" className="card audit-table-wrap">
        <table className="audit-table audit-table--stack">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Fecha" className="audit-cell-muted">
                  {formatDateTime(row.created_at)}
                </td>
                <td data-label="Usuario">{row.actor_name ?? "—"}</td>
                <td data-label="Acción">
                  <span className={`audit-action-tag tag-${row.action.split(".")[1] ?? "other"}`}>
                    {formatActionLabel(row.action)}
                  </span>
                </td>
                <td data-label="Detalle">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p style={{ color: "#b9accf", margin: "12px 0 0" }}>Aún no hay eventos registrados.</p>
        ) : null}
        <AuditListPagination
          pathname="/dashboard/audit"
          searchParams={sp}
          page={page}
          pageSize={pageSize}
          total={total}
          scrollAnchorId="audit-list-top"
        />
      </div>

      <p style={{ color: "#8a7aa3", fontSize: "0.85rem", marginTop: 16 }}>
        Las filas más recientes aparecen primero. Aplica la migración en Supabase si la tabla{" "}
        <code style={{ color: "#cdc2da" }}>audit_events</code> no existe todavía.
      </p>
    </div>
  );
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    "order.status_changed": "Estado orden",
    "order.assignee_changed": "Reasignación",
    "order.created": "Alta orden",
    "order.deleted": "Eliminación orden",
    "order.discount_changed": "Descuento",
    "order.detail_opened": "Vista",
    "order.note_added": "Nota",
    "order.image_uploaded": "Imagen",
    "client.created": "Alta cliente",
    "client.updated": "Cliente",
    "client.deleted": "Baja cliente",
    "vehicle.created": "Alta vehículo",
    "user.created": "Alta usuario",
    "user.updated": "Usuario",
    "user.deleted": "Baja usuario",
    "service.created": "Alta servicio",
    "service.updated": "Servicio",
    "service.deleted": "Baja servicio",
    "reward.created": "Alta recompensa",
    "reward.updated": "Recompensa",
    "reward.deleted": "Baja recompensa",
    "inventory.created": "Alta inventario",
    "inventory.updated": "Inventario",
    "inventory.deleted": "Baja inventario",
    "inventory.movement": "Mov. stock",
    "loyalty.redeem_free_service": "Canje servicio",
    "loyalty.redeem_catalog": "Canje catálogo"
  };
  return map[action] ?? action;
}
