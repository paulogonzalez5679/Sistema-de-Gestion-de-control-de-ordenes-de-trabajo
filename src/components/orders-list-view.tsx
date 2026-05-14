"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ActionDropdown } from "@/components/action-dropdown";
import { AdminDeleteOrderButton } from "@/components/admin-delete-order-button";
import { AdminOrderBillingActions } from "@/components/admin-order-billing-actions";
import { OrderPlazoCell } from "@/components/order-plazo-cell";
import { canEditWorkOrderDetails } from "@/lib/roles";
import type { ProfileRole } from "@/lib/types";
import type { WorkOrderListEnriched } from "@/modules/orders/order.service";
import { formatDateOnly, formatOrderStatus, formatPriority, formatTimeOnly } from "@/lib/ui-labels";

function OrderRowActions({
  order,
  userRole,
  showBilling
}: {
  order: WorkOrderListEnriched;
  userRole: ProfileRole | null;
  showBilling: boolean;
}) {
  return (
    <ActionDropdown ariaLabel={`Acciones de la orden ${order.order_number}`}>
      <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/orders/assigned/${order.id}`}>
        Ver detalle
      </Link>
      {canEditWorkOrderDetails(userRole) ? (
        <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/orders/${order.id}/edit`}>
          Editar orden
        </Link>
      ) : null}
      {showBilling ? (
        <>
          <AdminOrderBillingActions orderId={order.id} status={order.status} userRole={userRole} variant="menu" />
          <AdminDeleteOrderButton
            orderId={order.id}
            orderNumber={order.order_number}
            userRole={userRole}
            variant="menu"
          />
        </>
      ) : null}
    </ActionDropdown>
  );
}

export function OrdersListView({
  orders,
  userRole,
  showBilling,
  children
}: {
  orders: WorkOrderListEnriched[];
  userRole: ProfileRole | null;
  showBilling: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="orders-responsive-mobile">
        <ul className="orders-mobile-cards">
          {orders.map((order) => (
            <li key={order.id} className="orders-mobile-card card">
              <div className="orders-mobile-card__top">
                <div>
                  <p className="orders-mobile-card__eyebrow">Orden {order.order_number}</p>
                  <p className="orders-mobile-card__title">{order.vehicle_label}</p>
                  <p className="orders-mobile-card__sub">{order.client_name ?? "Cliente —"}</p>
                </div>
                <OrderRowActions order={order} userRole={userRole} showBilling={showBilling} />
              </div>
              <div className="orders-mobile-card__chips">
                <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                <span className="orders-mobile-chip">{formatPriority(order.priority)}</span>
              </div>
              <dl className="orders-mobile-card__dl">
                <div>
                  <dt>Asignado</dt>
                  <dd>{order.assignee_name ?? "—"}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>${Number(order.total_amount).toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Creada</dt>
                  <dd>
                    {formatDateOnly(order.created_at)} · {formatTimeOnly(order.created_at)}
                  </dd>
                </div>
                <div>
                  <dt>Finalizada</dt>
                  <dd>
                    {order.completed_at ? (
                      <>
                        {formatDateOnly(order.completed_at)} · {formatTimeOnly(order.completed_at)}
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Plazo</dt>
                  <dd>
                    <OrderPlazoCell
                      completedAt={order.completed_at}
                      scheduledStart={order.scheduled_start}
                      scheduledEnd={order.scheduled_end}
                      checkInAt={order.check_in_at}
                      status={order.status}
                    />
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <div className="orders-responsive-desktop">
        <div className="orders-table-scroll">
          <table className="orders-data-table">
            <thead>
              <tr>
                <th>N.º orden</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Asignado</th>
                <th>Total</th>
                <th>Creada</th>
                <th>Finalizada</th>
                <th>Plazo</th>
                <th className="orders-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="orders-cell-strong">{order.order_number}</span>
                  </td>
                  <td>
                    <span className={`status ${order.status}`}>{formatOrderStatus(order.status)}</span>
                  </td>
                  <td>{formatPriority(order.priority)}</td>
                  <td className="orders-cell-muted">{order.client_name ?? "—"}</td>
                  <td className="orders-cell-vehicle">{order.vehicle_label}</td>
                  <td className="orders-cell-muted">{order.assignee_name ?? "—"}</td>
                  <td>${Number(order.total_amount).toFixed(2)}</td>
                  <td className="orders-cell-date">
                    <div className="orders-cell-date-inner">
                      <span className="orders-cell-date__date">{formatDateOnly(order.created_at)}</span>
                      <span className="orders-cell-date__time">{formatTimeOnly(order.created_at)}</span>
                    </div>
                  </td>
                  <td className="orders-cell-date">
                    {order.completed_at ? (
                      <div className="orders-cell-date-inner">
                        <span className="orders-cell-date__date">{formatDateOnly(order.completed_at)}</span>
                        <span className="orders-cell-date__time">{formatTimeOnly(order.completed_at)}</span>
                      </div>
                    ) : (
                      <span className="orders-cell-muted">—</span>
                    )}
                  </td>
                  <td className="orders-cell-punctuality">
                    <OrderPlazoCell
                      completedAt={order.completed_at}
                      scheduledStart={order.scheduled_start}
                      scheduledEnd={order.scheduled_end}
                      checkInAt={order.check_in_at}
                      status={order.status}
                    />
                  </td>
                  <td className="orders-col-actions">
                    <OrderRowActions order={order} userRole={userRole} showBilling={showBilling} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {children}
    </>
  );
}
