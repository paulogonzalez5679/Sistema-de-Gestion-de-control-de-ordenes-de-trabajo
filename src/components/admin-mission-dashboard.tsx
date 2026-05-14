import Link from "next/link";
import { Manrope } from "next/font/google";
import { DashboardGlobalSearch } from "@/components/dashboard-global-search";
import type { InventoryItem } from "@/lib/types";
import { formatTimeOnly } from "@/lib/ui-labels";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap"
});

export type AdminMissionBayJob = {
  orderId: string;
  orderNumber: string;
  vehicleTitle: string;
  plate: string;
  bayLabel: string;
  stageLabel: string;
  progressPct: number;
  techLabel: string;
  estFinish: string | null;
  accent: "purple" | "cyan" | "lime";
};

export type AdminMissionArrival = {
  id: string;
  label: string;
  subtitle: string;
  dotClass: "cyan" | "muted";
};

export type AdminMissionDashboardProps = {
  todayRevenue: number;
  revenueDeltaPct: number | null;
  activeAppointmentsNow: number;
  appointmentsTodayTotal: number;
  inBayNow: number;
  vehiclesCompletedToday: number;
  awaitingPickup: number;
  /** Si es false (p. ej. gerente), no se muestra el panel de stock ni el enlace a inventario. */
  showInventoryPanel: boolean;
  lowStockItems: InventoryItem[];
  nextArrivals: AdminMissionArrival[];
  bayJobs: AdminMissionBayJob[];
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

const ADMIN_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQsNZ8UkLXXyft2QCdKqm8voAe9tk2dQYqZg27pnWNU4LBvA6a6d_N56fJ7PUvtgxbUMFkrKPz-FkrGS4XNoZaqf-X-jxITgnrbdC0vkW9SZXhZF7CC9-NBJrdbJImnChalBoM1ar3Z2CvlM5ebfi2JCnspK0WvljqHzFqclHSJyKEcSkLoYDlvY1x1MrCNc0_fbZNS9Ay9PG7iAVaxfvpQyR4nhb6cVaqhp2aF9rJgt38D_gZFM6Maq3phjzBwKonn_BJUZWO64Qt";

export function AdminMissionDashboard({
  todayRevenue,
  revenueDeltaPct,
  activeAppointmentsNow,
  appointmentsTodayTotal,
  inBayNow,
  vehiclesCompletedToday,
  awaitingPickup,
  showInventoryPanel,
  lowStockItems,
  nextArrivals,
  bayJobs
}: AdminMissionDashboardProps) {
  return (
    <div className={`admin-mission ${manrope.className}`}>
      <header className="admin-mission-header">
        <div>
          <h2 className="admin-mission-title">Mission Control</h2>
          <p className="admin-mission-subtitle">Resumen de las operaciones de detallado del día.</p>
        </div>
        <div className="admin-mission-header-actions">
          <DashboardGlobalSearch />
        </div>
      </header>

      <div className="admin-mission-body">
        <div className="admin-mission-stats">
          <div className="admin-stat-card admin-stat-card-purple">
            <div className="admin-stat-card-glow" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">Ingresos del día</p>
              <span className="material-symbols-outlined admin-stat-icon cyan">payments</span>
            </div>
            <h3 className="admin-stat-value">{formatMoney(todayRevenue)}</h3>
            <p className="admin-stat-foot tertiary">
              {revenueDeltaPct !== null ? (
                <>
                  <span className="material-symbols-outlined admin-stat-trend">trending_up</span>
                  {revenueDeltaPct >= 0 ? "+" : ""}
                  {revenueDeltaPct}% vs ayer
                </>
              ) : (
                "Sin datos de ayer"
              )}
            </p>
          </div>

          <div className="admin-stat-card admin-stat-card-cyan">
            <div className="admin-stat-card-glow cyan" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">Citas activas</p>
              <span className="material-symbols-outlined admin-stat-icon cyan">calendar_today</span>
            </div>
            <h3 className="admin-stat-value">{activeAppointmentsNow}</h3>
            <p className="admin-stat-foot muted">
              {appointmentsTodayTotal} programadas hoy · {inBayNow} en bahía
            </p>
          </div>

          <div className="admin-stat-card admin-stat-card-lime">
            <div className="admin-stat-card-glow lime" />
            <div className="admin-stat-card-head">
              <p className="admin-label-caps">Vehículos completados</p>
              <span className="material-symbols-outlined admin-stat-icon lime">check_circle</span>
            </div>
            <h3 className="admin-stat-value">{vehiclesCompletedToday}</h3>
            <p className="admin-stat-foot muted">
              {awaitingPickup > 0
                ? `Órdenes en cola (asignadas): ${awaitingPickup}`
                : "Sin órdenes asignadas en espera"}
            </p>
          </div>

          <Link href="/dashboard/orders/new/identify" className="admin-stat-card admin-stat-card-new">
            <div className="admin-stat-new-icon">
              <span className="material-symbols-outlined">add</span>
            </div>
            <p className="admin-label-caps center">Nueva cita</p>
          </Link>
        </div>

        <div className="admin-mission-grid">
          <section className="admin-mission-main">
            <div className="admin-section-head">
              <h3 className="admin-section-title">Bahías en curso</h3>
              <Link href="/dashboard/calendar" className="admin-link-caps">
                Ver calendario
              </Link>
            </div>

            {bayJobs.length === 0 ? (
              <div className="admin-glass-panel admin-empty-bays">
                <p className="admin-empty-text">No hay órdenes en progreso en este momento.</p>
                <Link href="/dashboard/orders" className="button secondary">
                  Ver órdenes
                </Link>
              </div>
            ) : (
              <div className="admin-bay-grid">
                {bayJobs.map((job) => (
                  <div key={job.orderId} className="admin-glass-panel admin-bay-card">
                    <div className={`admin-bay-top-accent ${job.accent}`} />
                    <div className="admin-bay-top">
                      <div>
                        <span className={`admin-bay-badge ${job.accent}`}>
                          {job.bayLabel} · {job.stageLabel}
                        </span>
                        <h4 className="admin-bay-vehicle">{job.vehicleTitle}</h4>
                        <p className="admin-bay-plate">
                          Matrícula: <strong>{job.plate}</strong> · {job.orderNumber}
                        </p>
                      </div>
                      <div className="admin-bay-car-icon">
                        <span className="material-symbols-outlined">directions_car</span>
                      </div>
                    </div>
                    <div className="admin-bay-progress-block">
                      <div className="admin-bay-progress-labels">
                        <span>Avance</span>
                        <span className={`admin-bay-pct ${job.accent}`}>{job.progressPct}%</span>
                      </div>
                      <div className="admin-bay-progress-track">
                        <div className={`admin-bay-progress-fill ${job.accent}`} style={{ width: `${job.progressPct}%` }} />
                      </div>
                    </div>
                    <div className="admin-bay-footer">
                      <div className="admin-bay-tech">
                        <span className="material-symbols-outlined admin-bay-tech-icon">person</span>
                        <span>{job.techLabel}</span>
                      </div>
                      <span className="admin-bay-est">
                        Fin est.: {job.estFinish ? formatTimeOnly(job.estFinish) : "—"}
                      </span>
                    </div>
                    <Link href={`/dashboard/orders/${job.orderId}`} className="admin-bay-open">
                      Abrir orden
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="admin-mission-aside">
            {showInventoryPanel ? (
            <div
              className={`admin-glass-panel admin-alert-panel ${lowStockItems.length === 0 ? "admin-stock-panel--ok" : ""}`}
            >
              <div className="admin-alert-head">
                <span
                  className={`material-symbols-outlined admin-alert-icon ${lowStockItems.length === 0 ? "admin-stock-icon--ok" : ""}`}
                  aria-hidden
                >
                  {lowStockItems.length === 0 ? "check_circle" : "warning"}
                </span>
                <h3 className={`admin-alert-title ${lowStockItems.length === 0 ? "admin-stock-title--ok" : ""}`}>
                  {lowStockItems.length === 0 ? "Stock abastecido" : "Stock bajo"}
                </h3>
              </div>
              {lowStockItems.length === 0 ? (
                <p className="admin-muted-p admin-stock-ok-text">No hay productos por debajo del punto de reposición.</p>
              ) : (
                <ul className="admin-alert-list">
                  {lowStockItems.map((item) => (
                    <li key={item.id} className="admin-alert-row">
                      <span>{item.name}</span>
                      <span className="admin-alert-pill">{item.quantity} u.</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/dashboard/inventory" className="admin-alert-btn">
                Ir a inventario
              </Link>
            </div>
            ) : null}

            <div className="admin-glass-panel admin-arrivals-panel">
              <div className="admin-section-head tight">
                <h3 className="admin-section-title sm">Próximas llegadas</h3>
                <span className="material-symbols-outlined admin-muted-icon">schedule</span>
              </div>
              {nextArrivals.length === 0 ? (
                <p className="admin-muted-p">No hay citas próximas registradas.</p>
              ) : (
                <ul className="admin-arrival-list">
                  {nextArrivals.map((row) => (
                    <li key={row.id} className="admin-arrival-row">
                      <span className={`admin-arrival-dot ${row.dotClass}`} aria-hidden />
                      <div>
                        <p className="admin-arrival-title">{row.label}</p>
                        <p className="admin-arrival-sub">{row.subtitle}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
