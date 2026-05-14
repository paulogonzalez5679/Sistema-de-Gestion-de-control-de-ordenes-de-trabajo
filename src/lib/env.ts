function required(value: string | undefined, names: string[]): string {
  const normalized = value?.trim();
  if (normalized) {
    return normalized;
  }
  throw new Error(
    `Missing required environment variable: ${names.join(", ")}. Add it to your .env file and restart the dev server.`
  );
}

function requiredUrl(value: string | undefined, names: string[]): string {
  const normalized = required(value, names);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Invalid protocol");
    }
    return normalized;
  } catch {
    throw new Error(
      `Invalid URL in environment variable (${names.join(", ")}): "${normalized}". Use format https://<project-ref>.supabase.co and restart the dev server.`
    );
  }
}

/** Supabase anon/service JWT payload includes `ref` (project id); URL host must be `<ref>.supabase.co`. */
function supabaseRefFromJwt(jwt: string): string | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = atob(base64 + pad);
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function assertSupabaseUrlMatchesKey(url: string, anonKey: string) {
  const ref = supabaseRefFromJwt(anonKey);
  if (!ref) return;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }
  const expected = `${ref}.supabase.co`;
  if (hostname !== expected) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL must be https://${ref}.supabase.co (hostname "${hostname}" does not match the ref inside your anon key). Fix .env and restart the dev server.`
    );
  }
}

const nextPublicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const nextPublicSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const resolvedUrl = requiredUrl(nextPublicSupabaseUrl, [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL"
]);
const resolvedAnonKey = required(nextPublicSupabaseAnonKey, [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY"
]);

assertSupabaseUrlMatchesKey(resolvedUrl, resolvedAnonKey);

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: resolvedUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};
