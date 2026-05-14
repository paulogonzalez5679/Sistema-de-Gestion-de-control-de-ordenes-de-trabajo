import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPagination } from "@/components/list-pagination";
import type { LoyaltyReward } from "@/lib/types";
import { CARD_GRID_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { listRewards } from "@/modules/loyalty/loyalty.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RewardsManagementPage({ searchParams }: Props) {
  const profile = await getSessionProfile();
  if (!canManageUsers(profile?.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const rewards = await listRewards(true);

  const active = rewards.filter((r) => r.is_active);
  const inactive = rewards.filter((r) => !r.is_active);

  const gridSize = CARD_GRID_PAGE_SIZE;
  const activePage = parsePageParam(sp.activePage);
  const inactivePage = parsePageParam(sp.inactivePage);
  const activeOffset = offsetForPage(activePage, gridSize);
  const inactiveOffset = offsetForPage(inactivePage, gridSize);
  const activeSlice = active.slice(activeOffset, activeOffset + gridSize);
  const inactiveSlice = inactive.slice(inactiveOffset, inactiveOffset + gridSize);

  return (
    <div className="loyalty-admin">
      <div className="loyalty-admin-head">
        <div>
          <h1 style={{ margin: 0 }}>Lealtad y recompensas</h1>
          <p className="loyalty-admin-sub">
            Define metas de puntos para clientes. Los puntos se otorgan al completar compras (órdenes) y al agendar
            citas.
          </p>
        </div>
        <Link className="button" href="/dashboard/rewards/new">
          Nueva recompensa
        </Link>
      </div>

      <section className="loyalty-admin-section">
        <h2 className="loyalty-admin-h2">Activas</h2>
        <div className="loyalty-admin-grid">
          {activeSlice.map((r) => (
            <RewardCard key={r.id} reward={r} />
          ))}
        </div>
        {active.length === 0 ? <p className="loyalty-admin-empty">No hay recompensas activas.</p> : null}
        <ListPagination
          pathname="/dashboard/rewards"
          searchParams={sp}
          page={activePage}
          pageSize={gridSize}
          total={active.length}
          paramName="activePage"
        />
      </section>

      {inactive.length > 0 ? (
        <section className="loyalty-admin-section">
          <h2 className="loyalty-admin-h2">Inactivas</h2>
          <div className="loyalty-admin-grid">
            {inactiveSlice.map((r) => (
              <RewardCard key={r.id} reward={r} />
            ))}
          </div>
          <ListPagination
            pathname="/dashboard/rewards"
            searchParams={sp}
            page={inactivePage}
            pageSize={gridSize}
            total={inactive.length}
            paramName="inactivePage"
          />
        </section>
      ) : null}
    </div>
  );
}

function RewardCard({ reward }: { reward: LoyaltyReward }) {
  return (
    <div className={`loyalty-admin-card ${reward.is_active ? "" : "loyalty-admin-card-off"}`}>
      <div className="loyalty-admin-card-top">
        <span className="material-symbols-outlined loyalty-admin-card-icon" aria-hidden>
          card_giftcard
        </span>
        <span className={`loyalty-admin-badge ${reward.is_active ? "loyalty-admin-badge-on" : "loyalty-admin-badge-off"}`}>
          {reward.is_active ? "Activa" : "Inactiva"}
        </span>
      </div>
      <h3 className="loyalty-admin-card-title">{reward.title}</h3>
      {reward.description ? (
        <p className="loyalty-admin-card-desc">{reward.description}</p>
      ) : (
        <p className="loyalty-admin-card-desc muted">Sin descripción</p>
      )}
      <div className="loyalty-admin-card-meta">
        <span>{reward.points_required} pts</span>
        <span>Orden {reward.sort_order}</span>
      </div>
      <Link className="button secondary loyalty-admin-card-link" href={`/dashboard/rewards/${reward.id}/edit`}>
        Editar
      </Link>
    </div>
  );
}
