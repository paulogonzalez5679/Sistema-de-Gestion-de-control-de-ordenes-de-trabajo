import { notFound, redirect } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { canManageServiceCatalog, canViewServicePricing } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { getServiceById } from "@/modules/services/service.service";

type Props = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: Props) {
  const profile = await getSessionProfile();
  if (!canManageServiceCatalog(profile?.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) {
    notFound();
  }

  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Editar servicio</h1>
      <ServiceForm mode="edit" initial={service} canViewPricing={canViewServicePricing(profile?.role)} />
    </div>
  );
}
