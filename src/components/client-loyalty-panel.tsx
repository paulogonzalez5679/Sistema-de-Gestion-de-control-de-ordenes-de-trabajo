import type { ClientRedemptionStatus, LoyaltyPointEvent } from "@/lib/types";
import { LOYALTY_MAX_POINTS } from "@/lib/loyalty-constants";
import { formatDateTime, formatLoyaltyReason } from "@/lib/ui-labels";
import { CatalogRewardRedeemList } from "@/components/catalog-reward-redeem-list";
import { ListPagination, type ListPaginationSearchParams } from "@/components/list-pagination";
import { RedeemFreeServiceButton } from "@/components/redeem-free-service-button";

type Props = {
  clientId: string;
  redemption: ClientRedemptionStatus;
  events: LoyaltyPointEvent[];
  eventsTotal: number;
  eventsPage: number;
  eventsPageSize: number;
  listSearchParams: ListPaginationSearchParams;
};

export function ClientLoyaltyPanel({
  clientId,
  redemption,
  events,
  eventsTotal,
  eventsPage,
  eventsPageSize,
  listSearchParams
}: Props) {
  const { balance, canRedeemToday, redeemableCatalog } = redemption;
  const pctTowardCap = Math.min(100, Math.round((balance / LOYALTY_MAX_POINTS) * 100));

  return (
    <div className="loyalty-client">
      <div className="loyalty-hero card">
        <div className="loyalty-hero-row">
          <div className="loyalty-hero-main">
            <div className="loyalty-hero-label">Puntos de recompensa</div>
            <div className="loyalty-hero-value">
              {balance}{" "}
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "#b9accf" }}>
                / {LOYALTY_MAX_POINTS}
              </span>
            </div>
            <p className="loyalty-hero-hint">
              Los puntos suben con los servicios de cada orden completada (según el catálogo), hasta{" "}
              {LOYALTY_MAX_POINTS} como máximo. Puedes canjear como máximo{" "}
              <strong>una bonificación al día</strong> (recompensa del catálogo o servicio gratis de {LOYALTY_MAX_POINTS}{" "}
              pts).
            </p>
            <div className="loyalty-meta" style={{ marginTop: 10 }}>
              Progreso hacia servicio gratis
            </div>
            <div
              className="loyalty-progress"
              role="progressbar"
              aria-valuenow={pctTowardCap}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ marginTop: 8 }}
            >
              <div className="loyalty-progress-bar" style={{ width: `${pctTowardCap}%` }} />
            </div>
            <RedeemFreeServiceButton clientId={clientId} balance={balance} canRedeemToday={canRedeemToday} />
          </div>
          <span className="material-symbols-outlined loyalty-hero-icon" aria-hidden>
            workspace_premium
          </span>
        </div>
      </div>

      <div className="card loyalty-card">
        <h3 style={{ marginTop: 0 }}>Recompensas del catálogo que puedes canjear</h3>
        <CatalogRewardRedeemList clientId={clientId} rewards={redeemableCatalog} canRedeemToday={canRedeemToday} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Actividad reciente</h3>
        {events.length === 0 ? (
          <p style={{ color: "#b9accf", margin: 0 }}>Aún no hay movimientos de puntos.</p>
        ) : (
          <div className="client-profile-table-wrap loyalty-activity-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.created_at)}</td>
                    <td>{formatLoyaltyReason(e.reason)}</td>
                    <td style={{ color: e.points_delta >= 0 ? "#7dffb2" : "#ff8f9c" }}>
                      {e.points_delta >= 0 ? "+" : ""}
                      {e.points_delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListPagination
          pathname={`/dashboard/clients/${clientId}`}
          searchParams={listSearchParams}
          page={eventsPage}
          pageSize={eventsPageSize}
          total={eventsTotal}
          paramName="loyaltyPage"
        />
      </div>
    </div>
  );
}
