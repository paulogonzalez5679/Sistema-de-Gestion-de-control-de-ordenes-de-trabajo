import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderBillingActions } from "@/components/admin-order-billing-actions";
import { OrderAuditBeacon } from "@/components/order-audit-beacon";
import { OrderIntakeSection } from "@/components/order-intake-section";
import { OrderStatusActions } from "@/components/order-status-actions";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { canViewServicePricing } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getOrderById, getOrderProductsEnriched } from "@/modules/orders/order.service";
import {
  formatDateTime,
  formatOrderStatus,
  formatPriority,
  formatServiceStatus
} from "@/lib/ui-labels";

type Params = { params: Promise<{ id: string }> };

type LineRow = {
  id: string;
  service_id: string;
  price: number | string;
  status: string;
  services: { name: string } | null;
};

function normalizeWorkOrderLines(raw: unknown): LineRow[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row) => {
    const r = row as {
      id: string;
      service_id: string;
      price: number | string;
      status: string;
      services: { name: string } | { name: string }[] | null;
    };
    const svc = r.services;
    const nameObj =
      Array.isArray(svc) && svc[0] ? svc[0] : svc && !Array.isArray(svc) ? svc : null;
    return { ...r, services: nameObj };
  });
}

export default async function AssignedJobDetailPage({ params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const sessionProfile = await getSessionProfile();
  const showServicePricing = canViewServicePricing(sessionProfile?.role);

  const supabase = createSupabaseAdminClient();

  const [{ data: client }, { data: vehicle }, { data: lineRows }, { data: appointment }, productLines] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", order.client_id).single(),
      supabase.from("vehicles").select("*").eq("id", order.vehicle_id).single(),
      supabase
        .from("work_order_services")
        .select("id, service_id, price, status, services(name)")
        .eq("work_order_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("appointments").select("starts_at, ends_at, bay").eq("work_order_id", id).maybeSingle(),
      getOrderProductsEnriched(id)
    ]);

  let assigneeName: string | null = null;
  if (order.assigned_to) {
    const { data: assignee } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.assigned_to)
      .single();
    assigneeName = assignee?.full_name ?? null;
  }

  const lines = normalizeWorkOrderLines(lineRows);
  const vehicleTitle = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const primaryScheduleStart = appointment?.starts_at ?? order.scheduled_start;
  const primaryScheduleEnd = appointment?.ends_at ?? order.scheduled_end;

  return (
    <div className="order-detail-page">
      <OrderAuditBeacon orderId={id} context="assigned" />

      <Link className="order-detail-back" href="/dashboard/orders">
        ← Volver al listado
      </Link>

      <header className="order-detail-hero">
        <div>
          <div className="order-detail-hero__eyebrow">Orden asignada</div>
          <h1 className="order-detail-hero__title">{order.order_number}</h1>
          <div className="order-detail-hero__chips">
            <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
            <span className="order-detail-priority">{formatPriority(order.priority)}</span>
          </div>
        </div>
        <div className="order-detail-hero__aside">
          <div className="order-detail-hero__total">
            <span className="order-detail-hero__total-label">Total orden</span>
            <span className="order-detail-hero__total-value">${Number(order.total_amount).toFixed(2)}</span>
          </div>
          <div className="order-detail-hero__meta-line">
            Creada {formatDateTime(order.created_at)}
          </div>
        </div>
      </header>

      <div className="order-detail-meta-grid">
        <section className="order-detail-card">
          <h2 className="order-detail-card__title">Cliente</h2>
          <p className="order-detail-card__lead">{client?.full_name ?? "—"}</p>
          <dl className="order-detail-dl">
            <div>
              <dt>Teléfono</dt>
              <dd>{client?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{client?.email ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="order-detail-card">
          <h2 className="order-detail-card__title">Vehículo</h2>
          <p className="order-detail-card__lead">{vehicleTitle || "—"}</p>
          {vehicle?.car_registration_photo ? (
            <figure className="order-detail-vehicle-photo-block">
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
            <p className="order-detail-muted" style={{ margin: "0 0 14px", fontSize: "0.82rem" }}>
              Sin foto de registro del vehículo.
            </p>
          )}
          <dl className="order-detail-dl">
            <div>
              <dt>Matrícula</dt>
              <dd>{vehicle?.plate ?? "—"}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{vehicle?.color ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="order-detail-card">
          <h2 className="order-detail-card__title">Programación y equipo</h2>
          <dl className="order-detail-dl">
            <div>
              <dt>Inicio</dt>
              <dd>{primaryScheduleStart ? formatDateTime(primaryScheduleStart) : "Sin definir"}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{primaryScheduleEnd ? formatDateTime(primaryScheduleEnd) : "Sin definir"}</dd>
            </div>
            <div>
              <dt>Bahía / ubicación</dt>
              <dd>{appointment?.bay?.trim() ? appointment.bay : "—"}</dd>
            </div>
            <div>
              <dt>Asignado a</dt>
              <dd>{assigneeName ?? "Sin asignar"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="order-detail-card order-detail-card--stretch">
        <div className="order-detail-card__head">
          <h2 className="order-detail-card__title" style={{ marginBottom: 0 }}>
            Servicios en la orden
          </h2>
          <span className="order-detail-muted">{lines.length} línea(s)</span>
        </div>
        <div className="order-line-table-wrap">
          <table className="order-line-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Estado línea</th>
                {showServicePricing ? <th style={{ textAlign: "right" }}>Precio</th> : null}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={showServicePricing ? 3 : 2} className="order-detail-muted">
                    No hay líneas de servicio cargadas.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="order-line-name">
                        {line.services?.name ?? `Servicio (${String(line.service_id).slice(0, 8)}…)`}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${line.status}`}>{formatServiceStatus(line.status)}</span>
                    </td>
                    {showServicePricing ? (
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ${Number(line.price).toFixed(2)}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="order-detail-card order-detail-card--stretch">
        <div className="order-detail-card__head">
          <h2 className="order-detail-card__title" style={{ marginBottom: 0 }}>
            Productos consumidos
          </h2>
          <span className="order-detail-muted">{productLines.length} producto(s)</span>
        </div>
        <div className="order-line-table-wrap">
          <table className="order-line-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Cantidad</th>
                <th style={{ textAlign: "right" }}>Precio</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {productLines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="order-detail-muted">
                    Sin productos añadidos. Podrás agregarlos al revisar la facturación.
                  </td>
                </tr>
              ) : (
                productLines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="order-line-name">{line.item_name}</span>
                    </td>
                    <td className="order-detail-muted">{line.item_sku}</td>
                    <td style={{ textAlign: "right" }}>{line.quantity}</td>
                    <td style={{ textAlign: "right" }}>${Number(line.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ${Number(line.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {Number(order.discount_amount ?? 0) > 0 ? (
          <p className="order-detail-muted" style={{ marginTop: 12 }}>
            Descuento aplicado: <strong>${Number(order.discount_amount).toFixed(2)}</strong>
          </p>
        ) : null}
      </section>

      {order.notes ? (
        <section className="order-detail-card order-detail-card--stretch">
          <h2 className="order-detail-card__title">Notas</h2>
          <p className="order-detail-notes">{order.notes}</p>
        </section>
      ) : null}

      <OrderIntakeSection orderId={id} />

      <section className="order-detail-card order-detail-card--stretch order-detail-actions-card">
        <h2 className="order-detail-card__title">Estado y administración</h2>
        <p className="order-detail-muted" style={{ marginTop: 0 }}>
          Avanza el trabajo desde aquí; la facturación la gestiona un administrador cuando corresponda.
        </p>
        <OrderStatusActions orderId={id} currentStatus={order.status} />
        <AdminOrderBillingActions orderId={id} status={order.status} userRole={sessionProfile?.role ?? null} />
        <div className="order-detail-link-row">
          <Link className="button" href={`/dashboard/orders/${id}`}>
            Vista operativa
          </Link>
        </div>
      </section>
    </div>
  );
}
