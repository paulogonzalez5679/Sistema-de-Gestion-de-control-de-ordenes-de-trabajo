/** Primer valor string de un query param (p. ej. `q` para búsquedas en listados). */
export function firstSearchQuery(
  sp: Record<string, string | string[] | undefined>,
  key = "q"
): string {
  const v = sp[key];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim();
  return "";
}
