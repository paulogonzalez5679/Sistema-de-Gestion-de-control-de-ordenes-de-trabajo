import Link from "next/link";
import { Manrope } from "next/font/google";
import type { WorkOrder } from "@/lib/types";
import { formatOrderStatus, formatPriority } from "@/lib/ui-labels";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap"
});

export type OperatorDashboardPanelProps = {
  /** Nombre para saludo; vacío si no hay perfil. */
  displayName: string;
  activeInBayCount: number;
  assignedQueueCount: number;
  completionRate: number;
  assignedOrdersPreview: WorkOrder[];
};

export function OperatorDashboardPanel({
  displayName,
  activeInBayCount,
  assignedQueueCount,
  completionRate,
  assignedOrdersPreview
}: OperatorDashboardPanelProps) {
  const greeting = displayName.trim() || "Equipo";

  return (
    <div className={`admin-mission operator-mission ${manrope.className}`}>
      <header className="admin-mission-header">
        <div>
          <h2 className="admin-mission-title">Mission Control</h2>
          <p className="admin-mission-subtitle">
            Hola, <strong style={{ fontWeight: 700 }}>{greeting}</strong> — resumen de tus asignaciones y accesos
            rápidos.
          </p>
        </div>
        <div className="admin-mission-header-actions operator-mission-header-actions">
          <Link href="/dashboard/orders/new/identify" className="admin-stat-card admin-stat-card-new operator-mission-new">
            <div className="admin-stat-new-icon">
              <span className="material-symbols-outlined">add</span>
            </div>
            <p className="admin-label-caps center">Nueva orden</p>
          </Link>
        </div>
      </header>

      <div className="admin-mission-body">
        <div className="admin-mission-stats">
          <div className="admin-stat-card admin-stat-card-purple">
            <div className="admin-stat-card-glow" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">En bahía</p>
              <span className="material-symbols-outlined admin-stat-icon cyan">garage</span>
            </div>
            <h3 className="admin-stat-value">{activeInBayCount}</h3>
            <p className="admin-stat-foot muted">Órdenes tuyas en progreso ahora</p>
          </div>

          <div className="admin-stat-card admin-stat-card-cyan">
            <div className="admin-stat-card-glow cyan" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">Tasa de cierre</p>
              <span className="material-symbols-outlined admin-stat-icon cyan">percent</span>
            </div>
            <h3 className="admin-stat-value">{completionRate}%</h3>
            <p className="admin-stat-foot muted">Sobre tus órdenes visibles en el panel</p>
          </div>

          <div className="admin-stat-card admin-stat-card-lime">
            <div className="admin-stat-card-glow lime" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">En cola</p>
              <span className="material-symbols-outlined admin-stat-icon lime">schedule</span>
            </div>
            <h3 className="admin-stat-value">{assignedQueueCount}</h3>
            <p className="admin-stat-foot muted">Asignadas pendientes de iniciar</p>
          </div>

          <Link href="/dashboard/calendar" className="admin-stat-card admin-stat-card-cyan">
            <div className="admin-stat-card-glow cyan" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">Calendario</p>
              <span className="material-symbols-outlined admin-stat-icon cyan">calendar_month</span>
            </div>
            <h3 className="admin-stat-value" style={{ fontSize: "1.1rem" }}>
              Ver agenda
            </h3>
            <p className="admin-stat-foot muted">Tus citas y bloques del día</p>
          </Link>
        </div>

        <section className="operator-mission-queue">
          <div className="admin-section-head">
            <h3 className="admin-section-title">Próximas asignadas</h3>
            <Link href="/dashboard/orders" className="admin-link-caps">
              Ver todas
            </Link>
          </div>

          {assignedOrdersPreview.length === 0 ? (
            <div className="admin-glass-panel admin-empty-bays">
              <p className="admin-empty-text">No tienes órdenes en estado asignado.</p>
              <Link href="/dashboard/orders/new/identify" className="button">
                Crear orden
              </Link>
            </div>
          ) : (
            <div className="admin-glass-panel operator-mission-table-wrap">
              <table className="operator-mission-table">
                <thead>
                  <tr>
                    <th>N.º orden</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assignedOrdersPreview.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Orden">{order.order_number}</td>
                      <td data-label="Estado">
                        <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                      </td>
                      <td data-label="Prioridad">{formatPriority(order.priority)}</td>
                      <td className="operator-mission-table__actions">
                        <Link className="button secondary" href={`/dashboard/orders/assigned/${order.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
