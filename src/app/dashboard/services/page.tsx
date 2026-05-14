import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPagination } from "@/components/list-pagination";
import type { Service } from "@/lib/types";
import { CARD_GRID_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { canManageServiceCatalog } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getAllServices } from "@/modules/services/service.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServicesCatalogPage({ searchParams }: Props) {
  const profile = await getSessionProfile();
  if (!canManageServiceCatalog(profile?.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const services = await getAllServices(false);
  const bundles = services.filter((s) => s.is_bundle);
  const addons = services.filter((s) => !s.is_bundle);

  const bundlesPage = parsePageParam(sp.bundlesPage);
  const addonsPage = parsePageParam(sp.addonsPage);
  const gridSize = CARD_GRID_PAGE_SIZE;
  const bundlesOffset = offsetForPage(bundlesPage, gridSize);
  const addonsOffset = offsetForPage(addonsPage, gridSize);
  const bundlesSlice = bundles.slice(bundlesOffset, bundlesOffset + gridSize);
  const addonsSlice = addons.slice(addonsOffset, addonsOffset + gridSize);

  return (
    <div className="svc-catalog">
      <div className="svc-catalog-head">
        <div>
          <h1 style={{ margin: 0 }}>Catálogo de servicios</h1>
          <p className="svc-catalog-sub">Administra paquetes y servicios adicionales del taller.</p>
        </div>
        <Link className="button" href="/dashboard/services/new">
          Nuevo servicio
        </Link>
      </div>

      <section className="svc-catalog-section">
        <h2 className="svc-catalog-h2">Paquetes (bundles)</h2>
        <div className="svc-catalog-grid">
          {bundlesSlice.map((s) => (
            <CatalogCard key={s.id} service={s} />
          ))}
        </div>
        {bundles.length === 0 ? (
          <p style={{ color: "#b9accf", marginTop: 8 }}>No hay paquetes registrados.</p>
        ) : null}
        <ListPagination
          pathname="/dashboard/services"
          searchParams={sp}
          page={bundlesPage}
          pageSize={gridSize}
          total={bundles.length}
          paramName="bundlesPage"
        />
      </section>

      <section className="svc-catalog-section">
        <h2 className="svc-catalog-h2">Servicios y complementos</h2>
        <div className="svc-catalog-grid">
          {addonsSlice.map((s) => (
            <CatalogCard key={s.id} service={s} />
          ))}
        </div>
        {addons.length === 0 ? (
          <p style={{ color: "#b9accf", marginTop: 8 }}>No hay servicios adicionales registrados.</p>
        ) : null}
        <ListPagination
          pathname="/dashboard/services"
          searchParams={sp}
          page={addonsPage}
          pageSize={gridSize}
          total={addons.length}
          paramName="addonsPage"
        />
      </section>
    </div>
  );
}

function CatalogCard({ service }: { service: Service }) {
  return (
    <div className={`svc-catalog-card ${service.is_active ? "" : "svc-catalog-card-inactive"}`}>
      <div className="svc-catalog-card-top">
        <span className="material-symbols-outlined svc-catalog-card-icon" aria-hidden>
          {service.is_bundle ? "inventory_2" : "handyman"}
        </span>
        <span className={`svc-catalog-badge ${service.is_active ? "svc-catalog-badge-on" : "svc-catalog-badge-off"}`}>
          {service.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>
      <h3 className="svc-catalog-card-title">{service.name}</h3>
      {service.description ? (
        <p className="svc-catalog-card-desc">{service.description}</p>
      ) : (
        <p className="svc-catalog-card-desc muted">Sin descripción</p>
      )}
      <div className="svc-catalog-card-meta">
        <span>${Number(service.base_price).toFixed(2)}</span>
        <span>{service.estimated_minutes} min</span>
        <span>{Number(service.reward_points ?? 0)} pts</span>
      </div>
      <Link className="button secondary svc-catalog-card-link" href={`/dashboard/services/${service.id}/edit`}>
        Editar
      </Link>
    </div>
  );
}
