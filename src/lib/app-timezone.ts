/**
 * Zona horaria del negocio (Ecuador continental, sin DST).
 * Las fechas de programación de órdenes y citas deben interpretarse y mostrarse en esta zona,
 * no en la zona del servidor (p. ej. UTC en Vercel) ni como UTC implícito en Postgres.
 */
export const APP_DISPLAY_TIME_ZONE = "America/Guayaquil";

/** Patrón `datetime-local` (sin offset ni Z). */
const NAIVE_LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function hasExplicitZone(s: string): boolean {
  return /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s.trimEnd());
}

/**
 * Convierte un valor de `datetime-local` (reloj de pared Ecuador) a ISO UTC para `timestamptz`.
 * Si la cadena ya trae Z u offset, se normaliza con `Date` y se devuelve ISO UTC.
 */
export function ecuadorWallDateTimeToUtcIso(input: string): string {
  const s = input.trim();
  if (!s) throw new Error("Fecha vacía.");

  if (hasExplicitZone(s) || !NAIVE_LOCAL_DATETIME.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Fecha no válida.");
    return d.toISOString();
  }

  const withSeconds = s.length === 16 ? `${s}:00` : s;
  const d = new Date(`${withSeconds}-05:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha no válida.");
  return d.toISOString();
}

/** Valor para `datetime-local` en zona Ecuador a partir de un instante ISO UTC. */
export function utcIsoToWallDatetimeLocal(iso: string, timeZone: string = APP_DISPLAY_TIME_ZONE): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}
