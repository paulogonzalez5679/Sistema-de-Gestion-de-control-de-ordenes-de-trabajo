"use client";

import { ClientsRowActions } from "@/components/clients-row-actions";
import { ListPagination } from "@/components/list-pagination";
import type { Client } from "@/lib/types";

type ClientRow = Pick<Client, "id" | "full_name" | "phone" | "email">;

export function ClientsDirectoryView({
  clients,
  vehicleByClientId,
  page,
  pageSize,
  total,
  searchParams
}: {
  clients: ClientRow[];
  vehicleByClientId: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <>
      <div className="clients-responsive-mobile">
        <ul className="clients-mobile-cards">
          {clients.map((client) => (
            <li key={client.id} className="clients-mobile-card card">
              <div className="clients-mobile-card__head">
                <div>
                  <p className="clients-mobile-card__name">{client.full_name}</p>
                  <p className="clients-mobile-card__meta">{client.phone}</p>
                  <p className="clients-mobile-card__meta">{client.email ?? "—"}</p>
                  <p className="clients-mobile-card__vehicle">
                    {vehicleByClientId[client.id] ?? "Sin vehículos"}
                  </p>
                </div>
                <ClientsRowActions clientId={client.id} clientName={client.full_name} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="clients-responsive-desktop card clients-table-card">
        <div className="clients-table-scroll">
          <table className="clients-data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Vehículo principal</th>
                <th className="clients-data-table__actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="Nombre">{client.full_name}</td>
                  <td data-label="Teléfono">{client.phone}</td>
                  <td data-label="Correo">{client.email ?? "-"}</td>
                  <td data-label="Vehículo">{vehicleByClientId[client.id] ?? "Sin vehículos"}</td>
                  <td data-label="Acciones" className="clients-data-table__actions">
                    <ClientsRowActions clientId={client.id} clientName={client.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ListPagination pathname="/dashboard/clients" searchParams={searchParams} page={page} pageSize={pageSize} total={total} />
    </>
  );
}
