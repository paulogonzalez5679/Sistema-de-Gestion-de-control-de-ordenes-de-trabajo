"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { formatDateTime, formatProfileRole } from "@/lib/ui-labels";
import { SideDrawer } from "@/components/side-drawer";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UsersStaffView({
  users,
  hasSearchFilter
}: {
  users: Profile[];
  /** Si es true y la lista está vacía, se muestra mensaje de «sin resultados» en lugar de «sin usuarios». */
  hasSearchFilter?: boolean;
}) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const emptyLabel = hasSearchFilter
    ? "Sin resultados para tu búsqueda."
    : "No hay usuarios registrados.";

  return (
    <>
      <div className="staff-responsive-mobile">
        {users.length === 0 ? (
          <p className="staff-empty">{emptyLabel}</p>
        ) : (
          <ul className="staff-mobile-cards">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="staff-mobile-card"
                onClick={() => setSelected(u)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(u);
                  }
                }}
              >
                <div className="staff-mobile-card__row">
                  <span className="staff-user-cell__avatar" aria-hidden>
                    {initials(u.full_name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <p className="staff-user-cell__name" style={{ margin: "0 0 4px" }}>
                      {u.full_name}
                    </p>
                    <p className="staff-data-table__muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                      {u.email}
                    </p>
                    <span className={`staff-role-pill role-${u.role}`} style={{ marginTop: 8, display: "inline-block" }}>
                      {formatProfileRole(u.role)}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        )}
      </div>

      <div className="staff-responsive-desktop staff-table-card card">
        <table className="staff-data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="staff-data-table__row"
                onClick={() => setSelected(u)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(u);
                  }
                }}
              >
                <td>
                  <div className="staff-user-cell">
                    <span className="staff-user-cell__avatar" aria-hidden>
                      {initials(u.full_name)}
                    </span>
                    <span className="staff-user-cell__name">{u.full_name}</span>
                  </div>
                </td>
                <td className="staff-data-table__muted">{u.email}</td>
                <td>
                  <span className={`staff-role-pill role-${u.role}`}>{formatProfileRole(u.role)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? <p className="staff-empty">{emptyLabel}</p> : null}
      </div>

      <SideDrawer
        open={Boolean(selected)}
        title="Perfil del staff"
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <div className="app-drawer__actions">
              <button type="button" className="button secondary" onClick={() => setSelected(null)}>
                Cerrar
              </button>
              <Link className="button" href={`/dashboard/users/${selected.id}/edit`}>
                Editar usuario
              </Link>
            </div>
          ) : null
        }
      >
        {selected ? (
          <>
            <div className="app-drawer__profile-head">
              <span className="app-drawer__profile-avatar">{initials(selected.full_name)}</span>
              <div>
                <p className="app-drawer__strong" style={{ margin: 0, fontSize: "1.15rem" }}>
                  {selected.full_name}
                </p>
                <span className={`staff-role-pill role-${selected.role}`}>{formatProfileRole(selected.role)}</span>
              </div>
            </div>

            <div className="app-drawer__section">
              <p className="app-drawer__eyebrow">Correo</p>
              <p className="app-drawer__strong">{selected.email}</p>
            </div>

            <div className="app-drawer__section">
              <p className="app-drawer__eyebrow">Alta en el sistema</p>
              <p className="app-drawer__muted">{formatDateTime(selected.created_at)}</p>
            </div>

            <div className="app-drawer__section">
              <p className="app-drawer__eyebrow">Última actualización</p>
              <p className="app-drawer__muted">{formatDateTime(selected.updated_at)}</p>
            </div>
          </>
        ) : null}
      </SideDrawer>
    </>
  );
}
