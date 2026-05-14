import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientLoyaltyPanel } from "@/components/client-loyalty-panel";
import { ClientVehiclePhotoTrigger } from "@/components/client-vehicle-photo-trigger";
import { DeleteClientButton } from "@/components/delete-client-button";
import { ListPagination } from "@/components/list-pagination";
import {
  CLIENT_PROFILE_VEHICLES_PAGE_SIZE,
  DEFAULT_LIST_PAGE_SIZE,
  offsetForPage,
  parsePageParam
} from "@/lib/pagination";
import { getClientById } from "@/modules/clients/client.service";
import { getRedemptionSummary, listLoyaltyEventsPage } from "@/modules/loyalty/loyalty.service";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { formatDateTime, formatOrderStatus } from "@/lib/ui-labels";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ClientProfilePage({ params, searchParams }: Params) {
  const { id } = await params;
  const sp = await searchParams;
  const client = await getClientById(id);
  if (!client) notFound();

  const vehiclesPage = parsePageParam(sp.vehiclesPage);
  const ordersPage = parsePageParam(sp.ordersPage);
  const loyaltyPage = parsePageParam(sp.loyaltyPage);
  const pageSize = DEFAULT_LIST_PAGE_SIZE;
  const vehiclesPageSize = CLIENT_PROFILE_VEHICLES_PAGE_SIZE;
  const vOffset = offsetForPage(vehiclesPage, vehiclesPageSize);
  const oOffset = offsetForPage(ordersPage, pageSize);
  const lOffset = offsetForPage(loyaltyPage, pageSize);

  const supabase = createSupabaseAdminClient();
  const [vehiclesRes, ordersRes, redemption, loyaltyPaged] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*", { count: "exact" })
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .range(vOffset, vOffset + vehiclesPageSize - 1),
    supabase
      .from("work_orders")
      .select("*", { count: "exact" })
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .range(oOffset, oOffset + pageSize - 1),
    getRedemptionSummary(id),
    listLoyaltyEventsPage(id, { limit: pageSize, offset: lOffset })
  ]);

  const vehicles = vehiclesRes.data ?? [];
  const vehiclesTotal = vehiclesRes.count ?? 0;
  const orders = ordersRes.data ?? [];
  const ordersTotal = ordersRes.count ?? 0;

  return (
    <div className="row client-profile-page">
      <Link className="order-detail-back" href="/dashboard/clients">
        ← Volver al listado
      </Link>
      <div className="client-profile-header">
        <h1>Perfil del cliente e historial</h1>
        <div className="client-profile-header-actions">
          <Link className="button secondary" href={`/dashboard/clients/${id}/edit`}>
            Editar cliente
          </Link>
          <DeleteClientButton clientId={client.id} clientName={client.full_name} redirectTo="/dashboard/clients" />
        </div>
      </div>
      <div className="row two">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{client.full_name}</h3>
          <p>{client.phone}</p>
          <p>{client.email ?? "Sin correo"}</p>
          <p>{client.notes ?? "Sin notas"}</p>
          <Link className="button" href={`/dashboard/orders/new/identify?clientId=${client.id}`}>
            Crear orden para este cliente
          </Link>
        </div>
        <div className="card">
          <div className="client-profile-vehicles-head">
            <h3>Vehículos vinculados</h3>
            <Link className="button secondary button-compact" href={`/dashboard/clients/${id}/vehicles/new`}>
              Agregar vehículo
            </Link>
          </div>
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="client-profile-vehicle-block">
              <strong>
                {vehicle.make} {vehicle.model}
              </strong>
              <ClientVehiclePhotoTrigger
                photoUrl={vehicle.car_registration_photo ?? null}
                plate={vehicle.plate}
                vin={vehicle.vin}
                vehicleTitle={`${vehicle.make} ${vehicle.model}`.trim()}
              />
            </div>
          ))}
          {vehicles.length === 0 ? <p style={{ color: "#b9accf", margin: 0 }}>Sin vehículos registrados.</p> : null}
          <ListPagination
            pathname={`/dashboard/clients/${id}`}
            searchParams={sp}
            page={vehiclesPage}
            pageSize={vehiclesPageSize}
            total={vehiclesTotal}
            paramName="vehiclesPage"
          />
        </div>
      </div>

      <div className="loyalty-client-wrap">
        <h2 style={{ margin: "0 0 12px", fontSize: "1.25rem" }}>Lealtad y recompensas</h2>
        <ClientLoyaltyPanel
          clientId={client.id}
          redemption={redemption}
          events={loyaltyPaged.events}
          eventsTotal={loyaltyPaged.total}
          eventsPage={loyaltyPage}
          eventsPageSize={pageSize}
          listSearchParams={sp}
        />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Historial de servicios</h3>
        <div className="client-profile-table-wrap">
          <table>
            <thead>
              <tr>
                <th>N.º orden</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>
                    <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                  </td>
                  <td>${Number(order.total_amount).toFixed(2)}</td>
                  <td>{formatDateTime(order.created_at)}</td>
                  <td>
                    <Link className="button secondary" href={`/dashboard/orders/${order.id}`}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 ? <p style={{ color: "#b9accf", marginTop: 8 }}>Aún no hay órdenes para este cliente.</p> : null}
        <ListPagination
          pathname={`/dashboard/clients/${id}`}
          searchParams={sp}
          page={ordersPage}
          pageSize={pageSize}
          total={ordersTotal}
          paramName="ordersPage"
        />
      </div>
    </div>
  );
}
