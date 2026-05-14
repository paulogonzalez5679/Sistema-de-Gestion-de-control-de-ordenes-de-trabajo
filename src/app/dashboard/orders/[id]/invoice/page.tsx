import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderInvoiceReview } from "@/components/order-invoice-review";
import { canManageOrderBilling } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/session-profile";
import {
  getOrderById,
  getOrderProductsEnriched
} from "@/modules/orders/order.service";
import { formatDateTime, formatOrderStatus, formatPriority, formatServiceStatus } from "@/lib/ui-labels";
import type { InventoryItem } from "@/lib/types";

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

export default async function OrderInvoiceReviewPage({ params }: Params) {
  const { id } = await params;

  const sessionProfile = await getSessionProfile();
  if (!canManageOrderBilling(sessionProfile?.role)) {
    redirect(`/dashboard/orders/assigned/${id}`);
  }

  const order = await getOrderById(id);
  if (!order) notFound();

  const supabase = createSupabaseAdminClient();
  const [{ data: client }, { data: vehicle }, { data: lineRows }, productLines, { data: inventoryRows }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", order.client_id).single(),
      supabase.from("vehicles").select("*").eq("id", order.vehicle_id).single(),
      supabase
        .from("work_order_services")
        .select("id, service_id, price, status, services(name)")
        .eq("work_order_id", id)
        .order("created_at", { ascending: true }),
      getOrderProductsEnriched(id),
      supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true })
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

  const services = normalizeWorkOrderLines(lineRows).map((line) => ({
    id: line.id,
    name: line.services?.name ?? `Servicio (${String(line.service_id).slice(0, 8)}…)`,
    price: Number(line.price),
    statusLabel: formatServiceStatus(line.status),
    statusCode: line.status
  }));

  const inventory = (inventoryRows ?? []) as InventoryItem[];
  const editable = order.status !== "invoiced" && order.status !== "cancelled";

  return (
    <div className="order-detail-page order-invoice-page">
      <Link className="order-detail-back" href={`/dashboard/orders/assigned/${id}`}>
        ← Volver a orden asignada
      </Link>

      <header className="order-detail-hero order-invoice-hero">
        <div>
          <div className="order-detail-hero__eyebrow">Revisión pre-factura</div>
          <h1 className="order-detail-hero__title">{order.order_number}</h1>
          <div className="order-detail-hero__chips">
            <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
            <span className="order-detail-priority">{formatPriority(order.priority)}</span>
          </div>
          <p className="order-invoice-hero__copy">
            Confirma el detalle, añade productos adicionales y aplica un descuento si corresponde. Al
            facturar, la orden se cierra y se descuenta del stock cualquier producto añadido.
          </p>
        </div>
        <div className="order-detail-hero__aside">
          <div className="order-detail-hero__total">
            <span className="order-detail-hero__total-label">Total actual</span>
            <span className="order-detail-hero__total-value">${Number(order.total_amount).toFixed(2)}</span>
          </div>
          <div className="order-detail-hero__meta-line">
            Operación finalizada{" "}
            {order.completed_at ? formatDateTime(order.completed_at) : "—"}
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
          <p className="order-detail-card__lead">
            {[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "—"}
          </p>
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
              <dt>Asignado a</dt>
              <dd>{assigneeName ?? "Sin asignar"}</dd>
            </div>
          </dl>
        </section>

        <section className="order-detail-card">
          <h2 className="order-detail-card__title">Programación</h2>
          <dl className="order-detail-dl">
            <div>
              <dt>Inicio</dt>
              <dd>{order.scheduled_start ? formatDateTime(order.scheduled_start) : "Sin definir"}</dd>
            </div>
            <div>
              <dt>Fin estimado</dt>
              <dd>{order.scheduled_end ? formatDateTime(order.scheduled_end) : "Sin definir"}</dd>
            </div>
            <div>
              <dt>Check-in</dt>
              <dd>{order.check_in_at ? formatDateTime(order.check_in_at) : "—"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <OrderInvoiceReview
        orderId={id}
        orderNumber={order.order_number}
        status={order.status}
        editable={editable}
        services={services}
        initialProducts={productLines.map((line) => ({
          id: line.id,
          item_id: line.item_id,
          item_name: line.item_name,
          item_sku: line.item_sku,
          quantity: line.quantity,
          unit_price: Number(line.unit_price),
          line_total: Number(line.line_total)
        }))}
        inventory={inventory.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit_cost: Number(item.unit_cost),
          quantity: Number(item.quantity)
        }))}
        initialDiscount={Number(order.discount_amount ?? 0)}
        initialTotal={Number(order.total_amount ?? 0)}
      />
    </div>
  );
}
