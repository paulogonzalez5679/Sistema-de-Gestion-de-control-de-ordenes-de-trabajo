import { notFound, redirect } from "next/navigation";
import { OrderAdminEditForm } from "@/components/order-admin-edit-form";
import { canEditWorkOrderDetails } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getOrderById } from "@/modules/orders/order.service";

type Params = { params: Promise<{ id: string }> };

export default async function OrderAdminEditPage({ params }: Params) {
  const { id } = await params;
  const session = await getSessionProfile();
  if (!canEditWorkOrderDetails(session?.role)) {
    redirect(`/dashboard/orders/assigned/${id}`);
  }
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="row">
      <OrderAdminEditForm order={order} />
    </div>
  );
}
