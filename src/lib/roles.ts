import type { ProfileRole } from "@/lib/types";

/** Panel Mission Control y búsqueda global: administración y gerencia. */
export function isManagementRole(role: ProfileRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

/** Catálogo de servicios (CRUD): administración y gerencia. El paso «servicios» de una orden nueva lo abren quienes tengan `orders.create`. */
export function canManageServiceCatalog(role: ProfileRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

/** Gestión de usuarios del sistema: solo administrador. */
export function canManageUsers(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Facturación final de órdenes (por facturar → facturado): solo administrador. */
export function canManageOrderBilling(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Inventario (listado, movimientos, edición): solo administrador. */
export function canManageInventory(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Edición completa de cabecera de orden (programación, cliente, vehículo, etc.): solo administrador. */
export function canEditWorkOrderDetails(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Alta de orden: solo el administrador puede elegir otro responsable; el resto queda autoasignado. */
export function canPickOrderAssignee(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}
