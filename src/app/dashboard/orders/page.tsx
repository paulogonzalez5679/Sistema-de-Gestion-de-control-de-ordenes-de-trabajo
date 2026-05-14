import Link from "next/link";
import { ListPagination } from "@/components/list-pagination";
import { ModuleListSearch } from "@/components/module-list-search";
import { OrdersListView } from "@/components/orders-list-view";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { firstSearchQuery } from "@/lib/search-params";
import { canManageOrderBilling } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getProfileByUserId } from "@/modules/profiles/profile.service";
import { getOrdersEnrichedPage } from "@/modules/orders/order.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileByUserId(user.id) : null;
  const showBilling = canManageOrderBilling(profile?.role);

  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const pageSize = DEFAULT_LIST_PAGE_SIZE;
  const offset = offsetForPage(page, pageSize);
  const q = firstSearchQuery(sp);

  let orders: Awaited<ReturnType<typeof getOrdersEnrichedPage>>["rows"];
  let total: number;
  if (!profile) {
    orders = [];
    total = 0;
  } else {
    const result = await getOrdersEnrichedPage({
      limit: pageSize,
      offset,
      search: q || undefined,
      ...(profile.role !== "admin" ? { assigneeUserId: profile.id } : {})
    });
    orders = result.rows;
    total = result.total;
  }

  return (
    <div className="orders-admin-page">
      <header className="orders-admin-header">
        <div>
          <p className="orders-admin-eyebrow">Centro de control</p>
          <h1 className="orders-admin-title">Órdenes de trabajo</h1>
          <p className="orders-admin-sub">
            {q
              ? `${total} resultado${total === 1 ? "" : "s"} para tu búsqueda.`
              : total === 0
                ? "Aún no hay órdenes registradas."
                : `${total} orden${total === 1 ? "" : "es"} en el sistema.`}
          </p>
        </div>
        <Link className="button orders-admin-cta" href="/dashboard/orders/new/identify">
          Nueva orden
        </Link>
      </header>

      <div className="orders-admin-toolbar">
        <ModuleListSearch
          actionPath="/dashboard/orders"
          defaultQuery={q}
          placeholder="Número de orden, notas, cliente, matrícula o vehículo…"
        />
      </div>

      <div className="card orders-admin-card">
        {orders.length === 0 ? (
          <div className="orders-empty">
            <p className="orders-empty-title">{q ? "Sin resultados para tu búsqueda" : "Sin órdenes por ahora"}</p>
            <p className="orders-empty-copy">
              {q
                ? "Prueba con otro término o revisa la ortografía."
                : "Crea la primera orden desde el flujo guiado (matrícula → servicios → asignación)."}
            </p>
            {q ? (
              <Link className="button secondary" href="/dashboard/orders">
                Ver todas las órdenes
              </Link>
            ) : (
              <Link className="button" href="/dashboard/orders/new/identify">
                Crear orden
              </Link>
            )}
          </div>
        ) : (
          <>
            <OrdersListView orders={orders} userRole={profile?.role ?? null} showBilling={showBilling}>
              <ListPagination pathname="/dashboard/orders" searchParams={sp} page={page} pageSize={pageSize} total={total} />
            </OrdersListView>
          </>
        )}
      </div>
    </div>
  );
}
