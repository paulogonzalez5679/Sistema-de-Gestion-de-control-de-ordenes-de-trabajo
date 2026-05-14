import type { WorkOrderStatus } from "@/lib/types";

/** La orden ya salió del taller (pendiente de factura o ya facturada). */
export function isWorkOrderOperationallyDone(status: WorkOrderStatus): boolean {
  return status === "pending_invoice" || status === "invoiced";
}

/** El operador ya no debe ejecutar ni cambiar estado operativo. */
export function isWorkOrderTerminalForOperator(status: WorkOrderStatus): boolean {
  return status === "pending_invoice" || status === "invoiced" || status === "cancelled";
}

/** Para KPI de “órdenes terminadas” vs total. */
export function countsTowardCompletionRate(status: WorkOrderStatus): boolean {
  return status === "pending_invoice" || status === "invoiced";
}

/**
 * Compara `completed_at` (momento de “Finalizar” → por facturar) con `scheduled_end` estimado al crear la orden.
 * @returns null si aún no hay cierre operativo; si no había fin estimado, "no_estimate".
 */
export type OrderFinishPunctuality = "on_time" | "late" | "no_estimate";

export function getOrderFinishPunctuality(
  completedAt: string | null,
  scheduledEnd: string | null
): OrderFinishPunctuality | null {
  if (!completedAt) return null;
  if (!scheduledEnd) return "no_estimate";
  return new Date(completedAt).getTime() > new Date(scheduledEnd).getTime() ? "late" : "on_time";
}

const PRE_EXECUTION_STATUSES: ReadonlyArray<WorkOrderStatus> = ["draft", "assigned"];

/**
 * Aún no vence el inicio programado: borrador/asignada esperando ventana (sin «Iniciar ejecución»).
 */
export function isPendingForUnstartedWorkOrder(
  status: WorkOrderStatus,
  scheduledStart: string | null,
  nowMs: number
): boolean {
  if (!PRE_EXECUTION_STATUSES.includes(status) || !scheduledStart) return false;
  const start = new Date(scheduledStart).getTime();
  if (Number.isNaN(start)) return false;
  return nowMs < start;
}

/**
 * Inicio programado ya llegó o pasó y la orden sigue sin ejecución (borrador o asignada: aún no «Iniciar ejecución»).
 */
export function isLateForUnstartedWorkOrder(
  status: WorkOrderStatus,
  scheduledStart: string | null,
  nowMs: number
): boolean {
  if (!PRE_EXECUTION_STATUSES.includes(status) || !scheduledStart) return false;
  const start = new Date(scheduledStart).getTime();
  if (Number.isNaN(start)) return false;
  return nowMs >= start;
}

/** Fracción restante del intervalo check-in → fin programado por debajo de la cual se muestra “próximo a expirar”. */
export const EXECUTION_SOON_FRACTION = 0.15;

/**
 * Estado del plazo mientras la ejecución está activa (desde “Iniciar ejecución” hasta `scheduled_end`).
 * Usa el instante `nowMs` para permitir pruebas y UI en vivo.
 */
export function computeLiveExecutionPlazo(
  nowMs: number,
  checkInAt: string,
  scheduledEnd: string
): "on_time" | "soon" | "late" {
  const deadline = new Date(scheduledEnd).getTime();
  const start = new Date(checkInAt).getTime();
  if (nowMs > deadline) return "late";
  const total = deadline - start;
  if (total <= 0) return "late";
  const remaining = deadline - nowMs;
  if (remaining / total <= EXECUTION_SOON_FRACTION) return "soon";
  return "on_time";
}
