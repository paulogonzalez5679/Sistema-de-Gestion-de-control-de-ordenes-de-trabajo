"use client";

import Link from "next/link";
import { ActionDropdown } from "@/components/action-dropdown";
import { DeleteClientButton } from "@/components/delete-client-button";

export function ClientsRowActions({
  clientId,
  clientName
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <ActionDropdown ariaLabel={`Acciones de ${clientName}`} align="end">
      <Link
        className="action-dropdown__item"
        role="menuitem"
        href={`/dashboard/orders/new/identify?clientId=${clientId}`}
      >
        Orden directa
      </Link>
      <Link className="action-dropdown__item" role="menuitem" href={`/dashboard/clients/${clientId}`}>
        Ver perfil
      </Link>
      <DeleteClientButton clientId={clientId} clientName={clientName} variant="menu" />
    </ActionDropdown>
  );
}
