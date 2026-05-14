import Link from "next/link";
import { notFound } from "next/navigation";
import { EditClientForm } from "@/components/edit-client-form";
import { getClientById } from "@/modules/clients/client.service";

type Params = { params: Promise<{ id: string }> };

export default async function EditClientPage({ params }: Params) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div className="row">
      <Link className="order-detail-back" href={`/dashboard/clients/${id}`}>
        ← Volver al perfil
      </Link>
      <h1 style={{ margin: 0 }}>Editar cliente</h1>
      <EditClientForm client={client} />
    </div>
  );
}
