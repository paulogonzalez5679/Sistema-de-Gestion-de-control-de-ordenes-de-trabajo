import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { internalError, ok, unauthorized } from "@/lib/api-response";
import { claimOutboxBatch, markOutboxFailed, markOutboxProcessed } from "@/modules/outbox/outbox.service";
import { processOutboxEvent } from "@/modules/outbox/outbox-handlers";

/**
 * Worker idempotente del outbox.
 *
 * Activación recomendada:
 *  - Llamar cada N segundos desde un cron externo (GitHub Actions, Supabase Edge Function
 *    schedule, Vercel Cron) enviando la cabecera `X-Job-Token` con el valor de
 *    `OUTBOX_WORKER_TOKEN`.
 *  - Como fallback manual, un admin puede ejecutar `curl -X POST` con el mismo header.
 *
 * Diseño:
 *  - Cada invocación reserva un lote (FOR UPDATE SKIP LOCKED en BD) y procesa eventos
 *    secuencialmente. Concurrencia segura: dos workers no procesan el mismo evento.
 *  - Si un handler falla, se marca como `failed` con `next_attempt_at` en el futuro
 *    (backoff lineal); el siguiente tick lo reintentará.
 *  - El endpoint no debe bloquear la respuesta de la API principal; por eso pasa por
 *    outbox en lugar de ejecutarse inline.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 50;

function tokensMatch(expected: string, got: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorize(request: NextRequest): boolean {
  const expected = process.env.OUTBOX_WORKER_TOKEN;
  if (!expected) {
    return false;
  }
  const got = request.headers.get("x-job-token") ?? "";
  return tokensMatch(expected, got);
}

export async function POST(request: NextRequest) {
  try {
    if (!authorize(request)) {
      return unauthorized("Token de worker inválido.");
    }

    const url = request.nextUrl;
    const batchSize = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25)
    );

    const events = await claimOutboxBatch(batchSize);

    const results: Array<{ id: string; topic: string; status: "processed" | "failed"; error?: string }> = [];

    for (const event of events) {
      try {
        await processOutboxEvent(event);
        await markOutboxProcessed(event.id);
        results.push({ id: event.id, topic: event.topic, status: "processed" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const retryIn = Math.min(30 * 60, 60 * Math.max(1, event.attempt_count));
        await markOutboxFailed(event.id, msg, retryIn);
        results.push({ id: event.id, topic: event.topic, status: "failed", error: msg });
      }
    }

    return ok({
      claimed: events.length,
      processed: results.filter((r) => r.status === "processed").length,
      failed: results.filter((r) => r.status === "failed").length,
      results
    });
  } catch (error) {
    return internalError(error);
  }
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return new NextResponse(null, { status: 401 });
  }
  return ok({ ready: true });
}
