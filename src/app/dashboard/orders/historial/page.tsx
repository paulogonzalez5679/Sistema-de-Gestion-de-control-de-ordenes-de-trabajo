import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderHistoryCalendarView } from "@/components/order-history-calendar-view";
import { canViewOrderHistory } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function OrdersHistoryPage() {
  const profile = await getSessionProfile();
  if (!canViewOrderHistory(profile?.role)) {
    redirect("/dashboard/orders");
  }

  return (
    <div className="calendar-page">
      <header className="orders-admin-header" style={{ marginBottom: 18 }}>
        <div>
          <Link className="order-detail-back" href="/dashboard/orders">
            ← Volver a órdenes
          </Link>
          <h1 className="calendar-page__title" style={{ marginTop: 10 }}>
            Historial de órdenes
          </h1>
          <p className="orders-admin-sub" style={{ marginBottom: 0 }}>
            Calendario de órdenes por facturar y facturadas.
          </p>
        </div>
      </header>
      <OrderHistoryCalendarView />
    </div>
  );
}
