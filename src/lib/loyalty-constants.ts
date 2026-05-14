/** Tope de puntos acumulables; al canjear servicio gratis el saldo vuelve a 0. */
export const LOYALTY_MAX_POINTS = 500;

/**
 * Día calendario para el límite de un canje por día (servidor Supabase + app).
 * Ecuador continental (sin DST). Sobrescribible con LOYALTY_CALENDAR_TIMEZONE en build/server.
 */
export const LOYALTY_CALENDAR_TIMEZONE =
  typeof process.env.LOYALTY_CALENDAR_TIMEZONE === "string" && process.env.LOYALTY_CALENDAR_TIMEZONE.length > 0
    ? process.env.LOYALTY_CALENDAR_TIMEZONE
    : "America/Guayaquil";
