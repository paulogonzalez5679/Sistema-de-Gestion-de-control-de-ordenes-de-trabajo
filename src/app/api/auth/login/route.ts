import { NextRequest, NextResponse } from "next/server";
import { internalError, ok, unauthorized } from "@/lib/api-response";
import {
  checkLoginRateLimitByEmail,
  LOGIN_RATE_LIMIT_MESSAGE
} from "@/lib/login-rate-limit";
import { loginSchema } from "@/lib/schemas/auth";
import { parseJsonBody } from "@/lib/schemas/zod-utils";
import { createSupabaseAuthClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const INVALID_CREDENTIALS = "Credenciales incorrectas. Revisa correo y contraseña.";

function mapAuthError(message: string): string {
  const lower = message.trim().toLowerCase();
  if (lower.includes("invalid login credentials")) return INVALID_CREDENTIALS;
  if (lower.includes("email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesión.";
  }
  if (lower.includes("too many requests")) return LOGIN_RATE_LIMIT_MESSAGE;
  return INVALID_CREDENTIALS;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, loginSchema);
    if ("response" in parsed) return parsed.response;

    const email = parsed.data.email.trim().toLowerCase();
    const emailRl = checkLoginRateLimitByEmail(email);
    if (!emailRl.ok) {
      return NextResponse.json(
        { error: LOGIN_RATE_LIMIT_MESSAGE },
        { status: 429, headers: { "Retry-After": String(emailRl.retryAfterSec) } }
      );
    }

    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password
    });

    if (error) {
      return unauthorized(mapAuthError(error.message ?? ""));
    }

    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
