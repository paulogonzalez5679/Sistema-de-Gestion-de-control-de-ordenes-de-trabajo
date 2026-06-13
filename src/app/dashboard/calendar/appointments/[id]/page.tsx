import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { canViewServicePricing } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { formatDateTime, formatTimeOnly } from "@/lib/ui-labels";

type Params = { params: Promise<{ id: string }> };

export default async function AppointmentDetailPage({ params }: Params) {
  const { id } = await params;
  const profile = await getSessionProfile();
  const showServicePricing = canViewServicePricing(profile?.role);
  const supabase = createSupabaseAdminClient();
  const { data: appointment } = await supabase.from("appointments").select("*").eq("id", id).single();
  if (!appointment) notFound();
  const { data: order } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", appointment.work_order_id)
    .single();
  const [{ data: client }, { data: vehicle }, { data: orderServices }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", order?.client_id ?? "").single(),
    supabase.from("vehicles").select("*").eq("id", order?.vehicle_id ?? "").single(),
    supabase.from("work_order_services").select("*").eq("work_order_id", appointment.work_order_id)
  ]);

  return (
    <div className="row">
      <Link className="order-detail-back" href="/dashboard/calendar">
        ← Volver al calendario
      </Link>
      <h1 style={{ margin: 0 }}>Detalle de cita</h1>
      <div className="row two">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{client?.full_name ?? "Cliente"}</h3>
          <p>{client?.phone}</p>
          <p>
            Vehículo: {vehicle?.make} {vehicle?.model}
          </p>
          <p>
            Horario: {formatDateTime(appointment.starts_at)} — {formatTimeOnly(appointment.ends_at)}
          </p>
          <p>Bahía: {appointment.bay ?? "—"}</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Servicios solicitados</h3>
          {(orderServices ?? []).map((service) => (
            <div key={service.id} style={{ marginBottom: 8 }}>
              Servicio n.º {service.service_id}
              {showServicePricing ? ` • $${Number(service.price).toFixed(2)}` : null}
            </div>
          ))}
          <h4>Total estimado: ${Number(order?.total_amount ?? 0).toFixed(2)}</h4>
          <Link className="button" href={`/dashboard/orders/assigned/${appointment.work_order_id}`}>
            Ir a la orden
          </Link>
        </div>
      </div>
    </div>
  );
}
