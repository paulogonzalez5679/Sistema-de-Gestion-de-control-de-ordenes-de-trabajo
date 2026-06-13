import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { canManageServiceCatalog, canViewServicePricing } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

export default async function NewServicePage() {
  const profile = await getSessionProfile();
  if (!canManageServiceCatalog(profile?.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Nuevo servicio</h1>
      <ServiceForm mode="create" canViewPricing={canViewServicePricing(profile?.role)} />
    </div>
  );
}
