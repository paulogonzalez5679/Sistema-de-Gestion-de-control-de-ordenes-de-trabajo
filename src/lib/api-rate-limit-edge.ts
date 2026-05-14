/**
 * In-memory fixed-window rate limiter for Edge middleware.
 * Mitigates brute-force and casual DoS; for production at scale use Redis/Upstash.
 */

type WindowEntry = { count: number; windowStart: number };

const store = new Map<string, WindowEntry>();
const MAX_TRACKED_KEYS = 8_000;

function windowMs(): number {
  const n = Number(process.env.API_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(n) && n >= 5_000 ? n : 60_000;
}

function maxRequests(): number {
  const n = Number(process.env.API_RATE_LIMIT_MAX);
  if (Number.isFinite(n) && n >= 1) return n;
  if (process.env.NODE_ENV === "development") return 2_000;
  return 120;
}

function prune(now: number, win: number): void {
  if (store.size <= MAX_TRACKED_KEYS) return;
  for (const [k, v] of store) {
    if (now - v.windowStart > win) store.delete(k);
  }
  if (store.size > MAX_TRACKED_KEYS) {
    const keys = [...store.keys()].slice(0, store.size - MAX_TRACKED_KEYS + 500);
    for (const k of keys) store.delete(k);
  }
}

export function checkApiRateLimit(clientKey: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const win = windowMs();
  const cap = maxRequests();
  prune(now, win);

  let e = store.get(clientKey);
  if (!e || now - e.windowStart > win) {
    e = { count: 1, windowStart: now };
    store.set(clientKey, e);
    return { ok: true };
  }
  if (e.count >= cap) {
    const retryAfterMs = win - (now - e.windowStart);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  e.count += 1;
  return { ok: true };
}

export function clientKeyFromRequest(request: { headers: Headers }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const ip = first || request.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 128);
}
