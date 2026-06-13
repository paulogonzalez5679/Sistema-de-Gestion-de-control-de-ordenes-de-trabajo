import { NextRequest } from "next/server";
import { z } from "zod";
import { ecuadorWallDateTimeToUtcIso } from "@/lib/app-timezone";
import { badRequest, forbidden, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { canViewAllWorkOrders } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { createOrUpdateAppointment, listAppointments } from "@/modules/orders/order.service";

function optionalIsoQuery(value: string | null): string | undefined {
  if (value === null || value.trim() === "") return undefined;
  const t = value.trim();
  if (Number.isNaN(Date.parse(t))) return "__invalid__";
  return t;
}

const appointmentPostSchema = z.object({
  work_order_id: z.string().uuid("work_order_id debe ser un UUID válido."),
  starts_at: z.string().min(1, "starts_at es obligatorio."),
  ends_at: z.string().min(1, "ends_at es obligatorio."),
  bay: z.union([z.string().max(80), z.null()]).optional()
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("appointments.read");
    if ("denied" in auth) return auth.denied;

    const start = optionalIsoQuery(request.nextUrl.searchParams.get("start"));
    const end = optionalIsoQuery(request.nextUrl.searchParams.get("end"));
    if (start === "__invalid__" || end === "__invalid__") {
      return badRequest("Los parámetros start y end deben ser fechas ISO válidas.");
    }
    const appointments = await listAppointments(start, end, {
      assigneeUserId: canViewAllWorkOrders(auth.profile.role) ? undefined : auth.profile.id
    });
    return ok(appointments);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("appointments.manage");
    if ("denied" in auth) return auth.denied;

    const body: unknown = await request.json();
    const parsed = appointmentPostSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Cuerpo de solicitud inválido.";
      return badRequest(msg);
    }
    const { work_order_id, starts_at, ends_at, bay } = parsed.data;
    if (!canViewAllWorkOrders(auth.profile.role)) {
      const supabase = createSupabaseAdminClient();
      const { data: wo } = await supabase
        .from("work_orders")
        .select("assigned_to")
        .eq("id", work_order_id)
        .maybeSingle();
      if (!wo || wo.assigned_to !== auth.profile.id) {
        return forbidden("Solo puedes crear citas en órdenes asignadas a ti.");
      }
    }
    let startsUtc: string;
    let endsUtc: string;
    try {
      startsUtc = ecuadorWallDateTimeToUtcIso(starts_at.trim());
      endsUtc = ecuadorWallDateTimeToUtcIso(ends_at.trim());
    } catch {
      return badRequest("starts_at y ends_at deben ser fechas válidas.");
    }
    const appointment = await createOrUpdateAppointment({
      work_order_id,
      starts_at: startsUtc,
      ends_at: endsUtc,
      bay: bay ?? null
    });

    return ok(appointment, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
