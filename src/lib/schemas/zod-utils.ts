import type { ZodSchema } from "zod";
import { badRequest } from "@/lib/api-response";

/**
 * Lee el JSON del request, lo parsea con Zod y devuelve el dato tipado
 * o una `Response` 400 con el primer mensaje de error.
 *
 * Uso:
 *   const parsed = await parseJsonBody(request, miSchema);
 *   if ("response" in parsed) return parsed.response;
 *   const data = parsed.data;
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: badRequest("Cuerpo JSON inválido.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "Cuerpo de solicitud inválido.";
    return { response: badRequest(msg) };
  }
  return { data: result.data };
}
