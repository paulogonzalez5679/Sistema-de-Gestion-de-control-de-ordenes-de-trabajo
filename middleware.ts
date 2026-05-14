import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkApiRateLimit, clientKeyFromRequest } from "@/lib/api-rate-limit-edge";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    const rl = checkApiRateLimit(`api:${clientKeyFromRequest(request)}`);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return response;
  }

  const protectedPath = !pathname.startsWith("/login");
  if (protectedPath) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Incluye `/api/*` para auth + rate limit. Excluye `/_next/*` (static, webpack-hmr, flight).
     */
    "/((?!_next/|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)"
  ]
};
