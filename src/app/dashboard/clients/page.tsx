import Link from "next/link";
import { ClientsDirectoryView } from "@/components/clients-directory-view";
import { ModuleListSearch } from "@/components/module-list-search";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { firstSearchQuery } from "@/lib/search-params";
import { listClientsPage } from "@/modules/clients/client.service";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const pageSize = DEFAULT_LIST_PAGE_SIZE;
  const offset = offsetForPage(page, pageSize);
  const q = firstSearchQuery(sp);
  const { clients, total } = await listClientsPage({ limit: pageSize, offset, search: q || undefined });

  const supabase = createSupabaseAdminClient();
  const vehiclesByClient = new Map<string, string>();
  if (clients.length) {
    const ids = clients.map((c) => c.id);
    const { data } = await supabase.from("vehicles").select("client_id, make, model, plate").in("client_id", ids);
    for (const row of data ?? []) {
      if (!vehiclesByClient.has(row.client_id)) {
        vehiclesByClient.set(row.client_id, `${row.make} ${row.model} (${row.plate})`);
      }
    }
  }

  const vehicleByClientId = Object.fromEntries(vehiclesByClient);

  return (
    <div className="row clients-page">
      <div className="clients-page-head">
        <h1 className="clients-page-title">Directorio de clientes</h1>
        <Link className="button clients-page-cta" href="/dashboard/clients/new">
          + Añadir cliente
        </Link>
      </div>
      <div className="clients-page-toolbar">
        <ModuleListSearch
          actionPath="/dashboard/clients"
          defaultQuery={q}
          placeholder="Nombre, teléfono, correo o cédula…"
        />
      </div>
      {clients.length === 0 ? (
        <div className="card clients-page-empty">
          <p className="clients-page-empty__title">{q ? "Sin resultados para tu búsqueda" : "Aún no hay clientes"}</p>
          <p className="clients-page-empty__copy">
            {q ? "Prueba con otro término o revisa la ortografía." : "Añade el primer cliente desde el botón superior."}
          </p>
          {q ? (
            <Link className="button secondary" href="/dashboard/clients">
              Ver todos los clientes
            </Link>
          ) : null}
        </div>
      ) : (
        <ClientsDirectoryView
          clients={clients}
          vehicleByClientId={vehicleByClientId}
          page={page}
          pageSize={pageSize}
          total={total}
          searchParams={sp}
        />
      )}
    </div>
  );
}
