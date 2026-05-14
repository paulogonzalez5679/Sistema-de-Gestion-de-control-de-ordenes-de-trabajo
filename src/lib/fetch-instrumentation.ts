/**
 * Heurística para no contar peticiones internas de Next.js (RSC, prefetch, HMR),
 * que también usan `fetch` y dispararían el indicador global sin parar.
 */
export function shouldInstrumentBrowserFetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  let urlStr = "";
  if (typeof input === "string") urlStr = input;
  else if (input instanceof Request) urlStr = input.url;
  else if (input instanceof URL) urlStr = input.href;
  else urlStr = String(input);

  if (urlStr.includes("/_next/") || urlStr.includes("__nextjs")) {
    return false;
  }

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(urlStr, base);
    if (u.pathname.startsWith("/_next/")) return false;
    if (u.searchParams.has("_rsc")) return false;
  } catch {
    if (urlStr.startsWith("/_next/")) return false;
  }

  const headers = new Headers(
    init?.headers ?? (typeof input === "object" && input instanceof Request ? input.headers : undefined)
  );
  const rsc = headers.get("rsc") ?? headers.get("RSC");
  if (rsc === "1") return false;
  const prefetch = headers.get("next-router-prefetch") ?? headers.get("Next-Router-Prefetch");
  if (prefetch === "1") return false;

  const nextInit = init as { next?: { internal?: boolean } } | undefined;
  if (nextInit?.next?.internal) return false;

  return true;
}
