const MAX_SEARCH_LEN = 120;

/**
 * Normalizes free-text search for embedding in PostgREST `.or(...ilike.%token%)` strings.
 * Commas and parentheses break the `or` filter parser; `%` and `_` are LIKE wildcards.
 */
export function sanitizePostgrestSearchToken(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim().slice(0, MAX_SEARCH_LEN);
  if (!t) return undefined;
  const cleaned = t
    .replace(/[,()%]/g, " ")
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}
