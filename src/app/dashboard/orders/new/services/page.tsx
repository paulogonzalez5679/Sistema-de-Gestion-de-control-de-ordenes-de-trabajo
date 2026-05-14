import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderServicesForm } from "@/components/order-services-form";
import { hasPermission } from "@/lib/permissions";
import { canPickOrderAssignee } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewOrderServicesPage({ searchParams }: Props) {
  const profile = await getSessionProfile();
  if (!profile || !hasPermission(profile.role, "orders.create")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const rawClient = sp.clientId;
  const clientId = typeof rawClient === "string" && rawClient.length > 0 ? rawClient : null;
  const identifyHref =
    clientId !== null
      ? `/dashboard/orders/new/identify?clientId=${encodeURIComponent(clientId)}`
      : "/dashboard/orders/new/identify";

  return (
    <div className="row">
      <header className="page-title-stack">
        <Link href={identifyHref} className="title-inline-back">
          ← Volver
        </Link>
        <h1 className="page-title-stack__heading">Nueva orden — Servicios</h1>
      </header>
      <OrderServicesForm
        currentUserId={profile.id}
        currentUserName={profile.full_name.trim() || profile.email}
        canPickAssignee={canPickOrderAssignee(profile.role)}
      />
    </div>
  );
}
