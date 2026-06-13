/**
 * Rate limiter dedicado al endpoint de login (F6 — brute-force).
 * In-memory, apto para Edge middleware y Route Handlers en standalone.
 */

type WindowEntry = { count: number; windowStart: number };

const store = new Map<string, WindowEntry>();
const MAX_TRACKED_KEYS = 4_000;

function ipWindowMs(): number {
  const n = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : 900_000;
}

function ipMaxAttempts(): number {
  const n = Number(process.env.LOGIN_RATE_LIMIT_MAX);
  if (Number.isFinite(n) && n >= 1) return n;
  if (process.env.NODE_ENV === "development") return 100;
  return 10;
}

function emailWindowMs(): number {
  const n = Number(process.env.LOGIN_RATE_LIMIT_EMAIL_WINDOW_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : 900_000;
}

function emailMaxAttempts(): number {
  const n = Number(process.env.LOGIN_RATE_LIMIT_EMAIL_MAX);
  if (Number.isFinite(n) && n >= 1) return n;
  if (process.env.NODE_ENV === "development") return 50;
  return 5;
}

function prune(now: number, win: number): void {
  if (store.size <= MAX_TRACKED_KEYS) return;
  for (const [k, v] of store) {
    if (now - v.windowStart > win) store.delete(k);
  }
  if (store.size > MAX_TRACKED_KEYS) {
    const keys = [...store.keys()].slice(0, store.size - MAX_TRACKED_KEYS + 250);
    for (const k of keys) store.delete(k);
  }
}

function checkLimit(
  key: string,
  cap: number,
  win: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now, win);

  let entry = store.get(key);
  if (!entry || now - entry.windowStart > win) {
    entry = { count: 1, windowStart: now };
    store.set(key, entry);
    return { ok: true };
  }
  if (entry.count >= cap) {
    const retryAfterMs = win - (now - entry.windowStart);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  entry.count += 1;
  return { ok: true };
}

export function checkLoginRateLimitByIp(
  clientKey: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  return checkLimit(`login:ip:${clientKey}`, ipMaxAttempts(), ipWindowMs());
}

export function checkLoginRateLimitByEmail(
  email: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const normalized = email.trim().toLowerCase().slice(0, 254);
  return checkLimit(`login:email:${normalized}`, emailMaxAttempts(), emailWindowMs());
}

export const LOGIN_RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
