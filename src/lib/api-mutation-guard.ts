import type { NextRequest } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Rutas que no usan sesión por cookie (worker con token). */
const CSRF_EXEMPT_PREFIXES = ["/api/jobs/process-outbox"];

export function isMutationCsrfAllowed(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;

  const pathname = request.nextUrl.pathname;
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}
