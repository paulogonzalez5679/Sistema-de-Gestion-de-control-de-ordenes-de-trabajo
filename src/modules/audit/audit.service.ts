import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { AuditEvent } from "@/lib/types";

export type RecordAuditInput = {
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  workOrderId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent(input: RecordAuditInput): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("audit_events").insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      work_order_id: input.workOrderId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {}
    });
    if (error) console.error("[audit]", error.message);
  } catch (e) {
    console.error("[audit]", e);
  }
}

export async function listAuditEvents(options: {
  limit?: number;
  offset?: number;
}): Promise<AuditEvent[]> {
  const limit = Math.min(Math.max(options.limit ?? 150, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as AuditEvent[];
}

export async function listAuditEventsWithTotal(options: {
  limit?: number;
  offset?: number;
}): Promise<{ events: AuditEvent[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 150, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const supabase = createSupabaseAdminClient();
  const { data, error, count } = await supabase
    .from("audit_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { events: (data ?? []) as AuditEvent[], total: count ?? 0 };
}

export async function enrichAuditEventsWithActorNames(events: AuditEvent[]): Promise<
  (AuditEvent & { actor_name: string | null })[]
> {
  const ids = [...new Set(events.map((e) => e.actor_id).filter(Boolean))] as string[];
  if (ids.length === 0) {
    return events.map((e) => ({ ...e, actor_name: null }));
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw error;
  const map = new Map((data ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
  return events.map((e) => ({
    ...e,
    actor_name: e.actor_id ? map.get(e.actor_id) ?? null : null
  }));
}

/** Exportación completa (paginada en servidor) para PDF o cierre de jornada. */
export async function fetchAllAuditEventsForExport(): Promise<AuditEvent[]> {
  const pageSize = 800;
  let offset = 0;
  const all: AuditEvent[] = [];
  for (let page = 0; page < 200; page += 1) {
    const batch = await listAuditEvents({ limit: pageSize, offset });
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/**
 * Elimina todos los eventos de auditoría. Usar solo tras exportar (cierre de jornada).
 * `neq` con UUID fijo fuerza filtro válido en PostgREST.
 */
export async function deleteAllAuditEvents(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const sentinel = "00000000-0000-0000-0000-000000000000";
  const { error, count } = await supabase
    .from("audit_events")
    .delete({ count: "exact" })
    .neq("id", sentinel);
  if (error) throw error;
  return count ?? 0;
}
