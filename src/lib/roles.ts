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

/** Ve todas las órdenes y citas del taller (sin filtro por asignatario). */
export function canViewAllWorkOrders(role: ProfileRole | null | undefined): boolean {
  return isManagementRole(role);
}

/** Alta o reasignación: administración y gerencia eligen responsable; operador/detallista queda autoasignado. */
export function canPickOrderAssignee(role: ProfileRole | null | undefined): boolean {
  return isManagementRole(role);
}

/** Descuentos en creación de orden o revisión pre-factura: administración y gerencia. */
export function canApplyOrderDiscount(role: ProfileRole | null | undefined): boolean {
  return isManagementRole(role);
}

/** Precios del catálogo y montos cobrados por línea de servicio: solo administrador. */
export function canViewServicePricing(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Calendario de historial (por facturar / facturado): solo administrador. */
export function canViewOrderHistory(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}

/** Configuración del sistema (ruta de almacenamiento local, etc.): solo administrador. */
export function canManageAppSettings(role: ProfileRole | null | undefined): boolean {
  return role === "admin";
}
