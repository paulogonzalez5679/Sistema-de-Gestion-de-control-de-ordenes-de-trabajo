import type { InventoryItem } from "@/lib/types";
import { APP_DISPLAY_TIME_ZONE } from "@/lib/app-timezone";

/** Locale fijo para fechas y números en la interfaz. */
export const APP_LOCALE = "es";

export { APP_DISPLAY_TIME_ZONE } from "@/lib/app-timezone";

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  assigned: "Asignada",
  in_progress: "En progreso",
  paused: "Pausada",
  pending_invoice: "Por facturar",
  invoiced: "Facturado",
  cancelled: "Cancelada"
};

const SERVICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  skipped: "Omitida"
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  receive: "Entrada",
  issue: "Salida",
  adjustment: "Ajuste"
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Información",
  warning: "Advertencia",
  error: "Error",
  success: "Éxito"
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente"
};

const PROFILE_ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operator: "Operador",
};

const LOYALTY_REASON_LABELS: Record<string, string> = {
  order_completed: "Orden completada (servicios)",
  appointment_booked: "Cita agendada",
  admin_adjustment: "Ajuste",
  redemption: "Servicio gratis (reinicio a 0)",
  catalog_redemption: "Canje de recompensa (catálogo)"
};

function fallbackLabel(map: Record<string, string>, value: string): string {
  return map[value] ?? value.replace(/_/g, " ");
}

export function formatOrderStatus(status: string): string {
  return fallbackLabel(ORDER_STATUS_LABELS, status);
}

export function formatServiceStatus(status: string): string {
  return fallbackLabel(SERVICE_STATUS_LABELS, status);
}

export function formatMovementType(type: string): string {
  return fallbackLabel(MOVEMENT_TYPE_LABELS, type);
}

export function formatNotificationSeverity(severity: string): string {
  return fallbackLabel(SEVERITY_LABELS, severity);
}

export function formatPriority(priority: string): string {
  return fallbackLabel(PRIORITY_LABELS, priority);
}

export function formatProfileRole(role: string): string {
  return fallbackLabel(PROFILE_ROLE_LABELS, role);
}

export function formatLoyaltyReason(reason: string): string {
  return fallbackLabel(LOYALTY_REASON_LABELS, reason);
}

export type StockStateCode = "in_stock" | "low" | "out";

export function getStockStateCode(item: InventoryItem): StockStateCode {
  if (item.quantity === 0) return "out";
  if (item.quantity <= item.reorder_point) return "low";
  return "in_stock";
}

const STOCK_STATE_LABELS: Record<StockStateCode, string> = {
  in_stock: "En existencia",
  low: "Stock bajo",
  out: "Sin stock"
};

export function formatStockState(code: StockStateCode): string {
  return STOCK_STATE_LABELS[code];
}

export function stockStateToCssStatus(code: StockStateCode): "success" | "warning" | "error" {
  if (code === "in_stock") return "success";
  if (code === "low") return "warning";
  return "error";
}

const displayTz: Intl.DateTimeFormatOptions = { timeZone: APP_DISPLAY_TIME_ZONE };

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(APP_LOCALE, displayTz);
}

export function formatDateOnly(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(APP_LOCALE, displayTz);
}

export function formatTimeOnly(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString(APP_LOCALE, displayTz);
}

/** Etiqueta para filtro de categoría "todas". */
export const ALL_CATEGORIES_LABEL = "Todas las categorías";
