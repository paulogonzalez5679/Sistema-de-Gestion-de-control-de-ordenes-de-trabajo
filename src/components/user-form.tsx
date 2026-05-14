"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { Profile, ProfileRole } from "@/lib/types";
import { formatProfileRole } from "@/lib/ui-labels";

type RoleMeta = {
  icon: string;
  description: string;
};

const ROLES: ProfileRole[] = ["admin", "manager", "operator", "detailer"];

const ROLE_META: Record<ProfileRole, RoleMeta> = {
  admin: {
    icon: "shield_person",
    description: "Acceso total a configuración, facturación y gestión del personal."
  },
  manager: {
    icon: "admin_panel_settings",
    description: "Supervisa órdenes, asigna tareas y administra la operación diaria."
  },
  operator: {
    icon: "support_agent",
    description: "Gestiona órdenes, citas y registros de clientes en piso."
  },
  detailer: {
    icon: "auto_awesome",
    description: "Ejecuta los servicios asignados y actualiza estados de avance."
  }
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; profile: Profile; currentUserId: string };

export function UserForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.profile : null;

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<ProfileRole>(initial?.role ?? "operator");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInitials = useMemo(() => buildInitials(fullName || initial?.full_name || ""), [fullName, initial?.full_name]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!fullName.trim() || !email.trim()) {
        throw new Error("Nombre y correo son obligatorios.");
      }

      if (props.mode === "create") {
        if (password.length < 12) {
          throw new Error("La contraseña debe tener al menos 12 caracteres.");
        }
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            password,
            role
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo crear el usuario.");
        router.push("/dashboard/users");
        router.refresh();
        return;
      }

      const payload: Record<string, unknown> = {
        full_name: fullName.trim(),
        email: email.trim(),
        role
      };
      if (password.length >= 12) payload.password = password;

      const res = await fetch(`/api/profiles/${props.profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      router.push("/dashboard/users");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") return;
    if (props.profile.id === props.currentUserId) {
      setError("No puedes eliminar tu propia cuenta.");
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario ${props.profile.full_name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${props.profile.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      router.push("/dashboard/users");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  const isSelf = props.mode === "edit" && props.profile.id === props.currentUserId;

  return (
    <form className="user-form-page" onSubmit={onSubmit}>
      <Link className="user-form-back" href="/dashboard/users">
        <span className="material-symbols-outlined" aria-hidden>
          arrow_back
        </span>
        Volver al listado
      </Link>

      <section className="user-form-hero">
        <div className="user-form-hero__identity">
          {isEdit ? (
            <div className="user-form-hero__avatar" aria-hidden>
              {avatarInitials}
              <span className="user-form-hero__role-pill">{formatProfileRole(role)}</span>
            </div>
          ) : (
            <div className="user-form-hero__avatar user-form-hero__avatar--placeholder" aria-hidden>
              <span className="material-symbols-outlined user-form-hero__avatar-icon">person_add</span>
            </div>
          )}
          <div className="user-form-hero__copy">
            <p className="user-form-hero__eyebrow">{isEdit ? "Editar usuario" : "Nuevo miembro del equipo"}</p>
            <h1 className="user-form-hero__name">
              {isEdit ? props.profile.full_name : "Crear usuario"}
            </h1>
            <span className="user-form-hero__sub">
              <span className="material-symbols-outlined" aria-hidden>
                {isEdit ? "mail" : "badge"}
              </span>
              {isEdit
                ? props.profile.email
                : "Define nombre, correo, rol y contraseña inicial."}
            </span>
          </div>
        </div>
        <div className="user-form-hero__actions">
          {isEdit ? (
            <button
              type="button"
              className="user-form-button user-form-button--danger"
              disabled={loading || isSelf}
              onClick={() => void onDelete()}
            >
              <span className="material-symbols-outlined" aria-hidden>
                delete
              </span>
              Eliminar usuario
            </button>
          ) : (
            <Link className="user-form-button user-form-button--ghost" href="/dashboard/users">
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
              Cancelar
            </Link>
          )}
          <button className="user-form-button user-form-button--primary" type="submit" disabled={loading}>
            <span className="material-symbols-outlined" aria-hidden>
              {isEdit ? "save" : "person_add"}
            </span>
            {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="user-form-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden>
            error
          </span>
          {error}
        </div>
      ) : null}

      <div className="user-form-bento">
        <div className="user-form-bento__col--main">
          <section className="user-form-bento-card">
            <h2 className="user-form-bento-card__title">
              <span className="material-symbols-outlined" aria-hidden>
                person
              </span>
              {isEdit ? "Información básica" : "Datos del usuario"}
            </h2>
            <p className="user-form-bento-card__hint">
              {isEdit
                ? "Actualiza el nombre y el correo. El correo es la credencial de inicio de sesión."
                : "El correo será el usuario de inicio de sesión. Asegúrate de que sea único en el sistema."}
            </p>

            <div className="user-form-grid">
              <label className="user-form-field user-form-field--wide">
                <span className="user-form-field__label">Nombre completo</span>
                <input
                  className="user-form-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. María González"
                  required
                />
              </label>

              <label className="user-form-field user-form-field--wide">
                <span className="user-form-field__label">Correo electrónico</span>
                <span className="user-form-input-wrap">
                  <span className="material-symbols-outlined" aria-hidden>
                    mail
                  </span>
                  <input
                    className="user-form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@taller.com"
                    required
                  />
                </span>
              </label>

              {!isEdit ? (
                <label className="user-form-field user-form-field--wide">
                  <span className="user-form-field__label">Contraseña temporal</span>
                  <span className="user-form-input-wrap">
                    <span className="material-symbols-outlined" aria-hidden>
                      lock
                    </span>
                    <input
                      className="user-form-input"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </span>
                </label>
              ) : null}
            </div>
          </section>

          {isEdit ? (
            <section className="user-form-bento-card user-form-bento-card--accent-secondary">
              <h2 className="user-form-bento-card__title">
                <span className="material-symbols-outlined" aria-hidden>
                  lock
                </span>
                Credenciales
              </h2>
              <p className="user-form-bento-card__hint">
                Cambia la contraseña si el usuario perdió el acceso. Deja el campo vacío para mantener la actual.
              </p>
              <div className="user-form-pwd-card">
                <div className="user-form-pwd-card__copy">
                  <p className="user-form-pwd-card__title">Nueva contraseña</p>
                  <p className="user-form-pwd-card__hint">Mínimo 6 caracteres. Se aplica al guardar cambios.</p>
                </div>
                <span className="user-form-input-wrap">
                  <span className="material-symbols-outlined" aria-hidden>
                    key
                  </span>
                  <input
                    className="user-form-input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Vacío = sin cambio"
                  />
                </span>
              </div>
            </section>
          ) : null}
        </div>

        <div className="user-form-bento__col--side">
          <section className="user-form-bento-card user-form-bento-card--accent-tertiary">
            <h2 className="user-form-bento-card__title">
              <span className="material-symbols-outlined" aria-hidden>
                admin_panel_settings
              </span>
              Rol del sistema
            </h2>
            <p className="user-form-bento-card__hint">
              Define los permisos del usuario. Puedes cambiarlo en cualquier momento.
            </p>
            <div className="user-form-roles">
              {ROLES.map((roleOption) => {
                const meta = ROLE_META[roleOption];
                const checked = role === roleOption;
                return (
                  <label key={roleOption} className="user-form-role">
                    <input
                      type="radio"
                      name="role"
                      value={roleOption}
                      className="user-form-role__input"
                      checked={checked}
                      onChange={() => setRole(roleOption)}
                    />
                    <span className="user-form-role__card">
                      <span className="user-form-role__top">
                        <span className="material-symbols-outlined user-form-role__icon" aria-hidden>
                          {meta.icon}
                        </span>
                        <span className="user-form-role__check" aria-hidden>
                          <span className="material-symbols-outlined user-form-role__check-mark">check</span>
                        </span>
                      </span>
                      <span>
                        <p className="user-form-role__name">{formatProfileRole(roleOption)}</p>
                        <p className="user-form-role__desc">{meta.description}</p>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="user-form-actions">
        <Link className="user-form-button user-form-button--ghost" href="/dashboard/users">
          <span className="material-symbols-outlined" aria-hidden>
            arrow_back
          </span>
          Volver al listado
        </Link>
        {isEdit ? (
          <button
            type="button"
            className="user-form-button user-form-button--danger"
            disabled={loading || isSelf}
            onClick={() => void onDelete()}
          >
            <span className="material-symbols-outlined" aria-hidden>
              delete
            </span>
            Eliminar usuario
          </button>
        ) : null}
        <button className="user-form-button user-form-button--primary" type="submit" disabled={loading}>
          <span className="material-symbols-outlined" aria-hidden>
            {isEdit ? "save" : "person_add"}
          </span>
          {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}

function buildInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
