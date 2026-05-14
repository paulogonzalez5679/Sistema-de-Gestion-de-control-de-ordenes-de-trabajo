import { notFound } from "next/navigation";
import { AddVehicleToClientWizard } from "@/components/add-vehicle-to-client-wizard";
import { getClientById } from "@/modules/clients/client.service";

type Params = { params: Promise<{ id: string }> };

export default async function ClientAddVehiclePage({ params }: Params) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <AddVehicleToClientWizard clientId={client.id} clientName={client.full_name} backHref={`/dashboard/clients/${client.id}`} />
  );
}
