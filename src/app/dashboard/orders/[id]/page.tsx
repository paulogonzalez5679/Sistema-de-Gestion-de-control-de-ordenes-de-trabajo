import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAuditBeacon } from "@/components/order-audit-beacon";
import { OrderOperationalUpdatesSection } from "@/components/order-operational-updates-section";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { getOrderById } from "@/modules/orders/order.service";
import { formatDateTime, formatOrderStatus, formatServiceStatus } from "@/lib/ui-labels";

type Params = { params: Promise<{ id: string }> };

export default async function WorkOrderOperationalViewPage({ params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const supabase = createSupabaseAdminClient();
  const [{ data: client }, { data: vehicle }, { data: orderServices }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", order.client_id).single(),
    supabase.from("vehicles").select("*").eq("id", order.vehicle_id).single(),
    supabase.from("work_order_services").select("*").eq("work_order_id", id).order("created_at")
  ]);

  return (
    <div className="row">
      <OrderAuditBeacon orderId={id} context="summary" />
      <Link className="order-detail-back" href={`/dashboard/orders/assigned/${id}`}>
        ← Volver a orden asignada
      </Link>
      <h1 style={{ margin: 0 }}>Detalle de orden — Vista operativa</h1>
      <div className="row two">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {order.order_number}{" "}
            <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
          </h3>
          <p>
            Cliente: <strong>{client?.full_name}</strong>
          </p>
          <p>
            Vehículo:{" "}
            <strong>
              {vehicle?.make} {vehicle?.model} ({vehicle?.plate})
            </strong>
          </p>
          {vehicle?.car_registration_photo ? (
            <figure className="order-detail-vehicle-photo-block" style={{ marginTop: 14 }}>
              <img
                src={vehicle.car_registration_photo}
                alt={`Vehículo ${vehicle.plate ?? ""}`}
                className="order-detail-vehicle-photo"
                loading="lazy"
              />
              <figcaption className="order-detail-muted order-detail-vehicle-photo-caption">
                Foto de registro
              </figcaption>
            </figure>
          ) : (
            <p className="order-detail-muted" style={{ marginTop: 12, fontSize: "0.82rem" }}>
              Sin foto de registro del vehículo.
            </p>
          )}
          <p>
            Entrega:{" "}
            {order.scheduled_end ? formatDateTime(order.scheduled_end) : "Sin programar"}
          </p>
          <p>Total: ${Number(order.total_amount).toFixed(2)}</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Avance del servicio</h3>
          {(orderServices ?? []).map((service) => (
            <div key={service.id} style={{ marginBottom: 10 }}>
              <div>
                Servicio: {service.service_id} —{" "}
                <span className={`status ${service.status}`}>{formatServiceStatus(service.status)}</span>
              </div>
              <div style={{ color: "#b9accf" }}>${Number(service.price).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
      <OrderOperationalUpdatesSection
        orderId={id}
        checkInAt={order.check_in_at}
        completedAt={order.completed_at}
      />
    </div>
  );
}
