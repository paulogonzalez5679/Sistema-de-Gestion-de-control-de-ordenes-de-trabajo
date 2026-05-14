import { createSupabaseAdminClient } from "@/lib/supabase-server";

/**
 * Outbox transaccional para side-effects asíncronos.
 *
 * Idea: la operación de negocio crítica (p. ej. crear orden) se queda atómica con la BD;
 * los efectos secundarios "best effort" (notificaciones masivas, sincronización con un
 * sistema externo, generación de PDF en lote) se publican aquí y los procesa un worker
 * (`/api/jobs/process-outbox`) en su propio tiempo. Esto desacopla la latencia del
 * request y permite reintentos seguros.
 */

export type OutboxTopic =
  | "notify.order.created"
  | "notify.order.started"
  | "notify.order.finished"
  | "notify.order.assignee_changed"
  | "notify.loyalty.points_awarded"
  | "notify.loyalty.free_service_redeemed"
  | "notify.loyalty.catalog_reward_redeemed"
  | "export.audit_pdf";

export type OutboxEvent = {
  id: string;
  topic: OutboxTopic;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "processed" | "failed";
  attempt_count: number;
  last_error: string | null;
  next_attempt_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishOutboxInput = {
  topic: OutboxTopic;
  payload: Record<string, unknown>;
  /** Retraso inicial (segundos) antes del primer intento. Por defecto: ahora. */
  delaySeconds?: number;
};

/**
 * Publica un evento en la outbox. No bloquea el flujo principal: si la inserción falla,
 * el caller decide qué hacer (típicamente loguear y continuar — el side-effect es opcional).
 */
export async function publishOutbox(input: PublishOutboxInput): Promise<OutboxEvent | null> {
  const supabase = createSupabaseAdminClient();
  const delay = Math.max(0, Math.floor(input.delaySeconds ?? 0));
  const nextAttemptAt = new Date(Date.now() + delay * 1000).toISOString();
  const { data, error } = await supabase
    .from("outbox_events")
    .insert({
      topic: input.topic,
      payload: input.payload,
      next_attempt_at: nextAttemptAt
    })
    .select("*")
    .single();
  if (error) {
    console.error("publishOutbox:", error);
    return null;
  }
  return data as OutboxEvent;
}

/**
 * Reserva un lote de eventos pendientes para procesar. Usa `FOR UPDATE SKIP LOCKED` en
 * BD a través del RPC `outbox_claim` para permitir múltiples workers concurrentes.
 */
export async function claimOutboxBatch(limit = 25): Promise<OutboxEvent[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("outbox_claim", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as OutboxEvent[];
}

export async function markOutboxProcessed(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("outbox_mark_processed", { p_id: id });
  if (error) throw error;
}

export async function markOutboxFailed(id: string, errorMessage: string, retryInSeconds = 60): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("outbox_mark_failed", {
    p_id: id,
    p_error: errorMessage,
    p_retry_in_seconds: retryInSeconds
  });
  if (error) throw error;
}
