import { LOYALTY_CALENDAR_TIMEZONE } from "@/lib/loyalty-constants";

/** Fecha calendario YYYY-MM-DD en la zona configurada (p. ej. Ecuador). */
export function loyaltyCalendarDateKey(iso: Date | string, timeZone = LOYALTY_CALENDAR_TIMEZONE): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-CA", { timeZone });
}

/** Mismo día calendario en Ecuador (o la zona definida) que en las funciones SQL de Supabase. */
export function isSameLoyaltyCalendarDay(
  a: Date | string,
  b: Date = new Date(),
  timeZone = LOYALTY_CALENDAR_TIMEZONE
): boolean {
  return loyaltyCalendarDateKey(a, timeZone) === loyaltyCalendarDateKey(b, timeZone);
}

/** True si ya hubo un canje hoy en la zona del programa de lealtad. */
export function redeemedLoyaltyToday(lastRedemptionAt: string | null | undefined): boolean {
  if (!lastRedemptionAt) return false;
  return isSameLoyaltyCalendarDay(lastRedemptionAt, new Date());
}

/** Puede usar una acción de canje hoy (servicio gratis o catálogo). */
export function canUseDailyRedemption(lastRedemptionAt: string | null | undefined): boolean {
  return !redeemedLoyaltyToday(lastRedemptionAt);
}
