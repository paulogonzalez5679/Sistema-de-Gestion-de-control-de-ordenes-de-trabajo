import { forbidden, unauthorized } from "@/lib/api-response";
import { getSessionProfile } from "@/lib/session-profile";
import type { Profile, ProfileRole } from "@/lib/types";

/**
 * Matriz central de autorización: recurso × acción × rol.
 *
 * Reglas de uso:
 * - Cada handler de `/api/*` debe llamar a `requirePermission` antes de tocar datos.
 * - Los nombres se leen como "recurso.acción" para no chocar con cadenas libres
 *   (ej. la acción de auditoría `order.created` no es una permission).
 * - Si una ruta necesita lógica adicional (p. ej. transición de estado), usa el
 *   `profile` devuelto por `requirePermission` y compón con helpers de dominio.
 */

export type Permission =
  | "orders.read"
  | "orders.create"
  | "orders.update"
  | "orders.delete"
  | "orders.set_services"
  | "orders.add_product"
  | "orders.remove_product"
  | "orders.add_note"
  | "orders.upload_image"
  | "orders.view_audit_beacon"
  | "orders.view_history"
  | "orders.transition_billing"
  | "orders.apply_discount"
  | "orders.edit_details"
  | "clients.read"
  | "clients.create"
  | "clients.update"
  | "clients.delete"
  | "vehicles.read"
  | "vehicles.create"
  | "vehicles.update"
  | "vehicles.delete"
  | "services.read"
  | "services.view_pricing"
  | "services.manage"
  | "inventory.read"
  | "inventory.create"
  | "inventory.update"
  | "inventory.delete"
  | "inventory.movement.read"
  | "inventory.movement.create"
  | "appointments.read"
  | "appointments.manage"
  | "rewards.read"
  | "rewards.manage"
  | "loyalty.read_status"
  | "loyalty.redeem_free_service"
  | "loyalty.redeem_catalog"
  | "audit.read"
  | "audit.export"
  | "audit.purge"
  | "notifications.read"
  | "notifications.update"
  | "notifications.delete"
  | "notifications.create_admin"
  | "profiles.read_self"
  | "profiles.read_staff_list"
  | "profiles.manage"
  | "settings.manage"
  | "dashboard.global_search";

const ALL_ROLES: ProfileRole[] = ["admin", "manager", "operator", "detailer"];
const MANAGEMENT_ROLES: ProfileRole[] = ["admin", "manager"];
const ADMIN_ONLY: ProfileRole[] = ["admin"];

/**
 * Quién puede ejecutar cada permiso. Si un permiso no aparece en el mapa, se considera
 * "denegado por defecto" — patrón de allow-list para evitar omisiones silenciosas.
 */
const MATRIX: Record<Permission, ProfileRole[]> = {
  "orders.read": ALL_ROLES,
  /** Alta de orden en flujo guiado: taller (operador/detallista) y gerencia; el asignatario lo fija la API salvo gerencia/admin. */
  "orders.create": ALL_ROLES,
  "orders.update": ALL_ROLES,
  "orders.edit_details": ADMIN_ONLY,
  "orders.delete": ADMIN_ONLY,
  "orders.set_services": MANAGEMENT_ROLES,
  "orders.add_product": MANAGEMENT_ROLES,
  "orders.remove_product": MANAGEMENT_ROLES,
  "orders.add_note": ALL_ROLES,
  "orders.upload_image": ALL_ROLES,
  "orders.view_audit_beacon": ALL_ROLES,
  "orders.view_history": ADMIN_ONLY,
  "orders.transition_billing": ADMIN_ONLY,
  "orders.apply_discount": MANAGEMENT_ROLES,

  "clients.read": ALL_ROLES,
  /** Registro completo cliente+vehículo desde el flujo de orden (matrícula no encontrada). */
  "clients.create": [...MANAGEMENT_ROLES, "operator", "detailer"],
  "clients.update": MANAGEMENT_ROLES,
  "clients.delete": ADMIN_ONLY,

  "vehicles.read": ALL_ROLES,
  "vehicles.create": [...MANAGEMENT_ROLES, "operator", "detailer"],
  "vehicles.update": MANAGEMENT_ROLES,
  "vehicles.delete": ADMIN_ONLY,

  "services.read": ALL_ROLES,
  "services.view_pricing": ADMIN_ONLY,
  "services.manage": MANAGEMENT_ROLES,

  "inventory.read": [...MANAGEMENT_ROLES, "operator", "detailer"],
  "inventory.create": ADMIN_ONLY,
  "inventory.update": ADMIN_ONLY,
  "inventory.delete": ADMIN_ONLY,
  "inventory.movement.read": ADMIN_ONLY,
  "inventory.movement.create": ADMIN_ONLY,

  "appointments.read": ALL_ROLES,
  "appointments.manage": [...MANAGEMENT_ROLES, "operator", "detailer"],

  "rewards.read": ALL_ROLES,
  "rewards.manage": ADMIN_ONLY,

  "loyalty.read_status": ALL_ROLES,
  "loyalty.redeem_free_service": MANAGEMENT_ROLES,
  "loyalty.redeem_catalog": MANAGEMENT_ROLES,

  "audit.read": ADMIN_ONLY,
  "audit.export": ADMIN_ONLY,
  "audit.purge": ADMIN_ONLY,

  "notifications.read": ALL_ROLES,
  "notifications.update": ALL_ROLES,
  "notifications.delete": MANAGEMENT_ROLES,
  "notifications.create_admin": ADMIN_ONLY,

  "profiles.read_self": ALL_ROLES,
  "profiles.read_staff_list": ALL_ROLES,
  "profiles.manage": ADMIN_ONLY,
  "settings.manage": ADMIN_ONLY,

  "dashboard.global_search": MANAGEMENT_ROLES
};

export function hasPermission(role: ProfileRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowed = MATRIX[permission];
  return Array.isArray(allowed) && allowed.includes(role);
}

export type Authorized = { profile: Profile };
export type AuthorizationResult = Authorized | { denied: Response };

/**
 * Carga el perfil de la sesión y comprueba el permiso requerido contra la matriz.
 * Devuelve `{ profile }` si pasa o `{ denied }` con una `Response` 401/403 lista para retornar.
 */
export async function requirePermission(permission: Permission): Promise<AuthorizationResult> {
  const profile = await getSessionProfile();
  if (!profile) {
    return { denied: unauthorized("Se requiere sesión.") };
  }
  if (!hasPermission(profile.role, permission)) {
    return { denied: forbidden("No tienes permiso para esta acción.") };
  }
  return { profile };
}

/**
 * Variante para casos en que ya se conoce el perfil (p. ej. tras llamar a `requirePermission`)
 * y solo se necesita una segunda comprobación: devuelve `Response` o `null`.
 */
export function denyIfMissing(profile: Profile | null | undefined, permission: Permission): Response | null {
  if (!profile) return unauthorized("Se requiere sesión.");
  if (!hasPermission(profile.role, permission)) {
    return forbidden("No tienes permiso para esta acción.");
  }
  return null;
}
