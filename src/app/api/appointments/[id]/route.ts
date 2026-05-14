import { NextRequest } from "next/server";
import { ecuadorWallDateTimeToUtcIso } from "@/lib/app-timezone";
import { badRequest, forbidden, internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import {
  createOrUpdateAppointment,
  getAppointmentEnriched,
  type AppointmentEnrichedDetail
} from "@/modules/orders/order.service";
import type { Profile } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const APPOINTMENT_ASSIGNMENT_FORBIDDEN =
  "Solo puedes ver o gestionar citas de órdenes asignadas a ti.";

async function gateAppointmentByAssignee(
  profile: Profile,
  appointmentId: string
): Promise<{ ok: true; data: AppointmentEnrichedDetail } | { ok: false; response: Response }> {
  const data = await getAppointmentEnriched(appointmentId);
  if (!data) return { ok: false, response: notFound("Appointment") };
  if (profile.role === "admin") return { ok: true, data };
  const assignee = data.order?.assigned_to ?? null;
  if (!assignee || assignee !== profile.id) {
    return { ok: false, response: forbidden(APPOINTMENT_ASSIGNMENT_FORBIDDEN) };
  }
  return { ok: true, data };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("appointments.read");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateAppointmentByAssignee(auth.profile, id);
    if (!gate.ok) return gate.response;
    return ok(gate.data);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("appointments.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateAppointmentByAssignee(auth.profile, id);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    if (!body?.starts_at || !body?.ends_at) {
      return badRequest("starts_at and ends_at are required");
    }
    let startsUtc: string;
    let endsUtc: string;
    try {
      startsUtc = ecuadorWallDateTimeToUtcIso(String(body.starts_at).trim());
      endsUtc = ecuadorWallDateTimeToUtcIso(String(body.ends_at).trim());
    } catch {
      return badRequest("starts_at y ends_at deben ser fechas válidas.");
    }
    const appointment = await createOrUpdateAppointment({
      id,
      work_order_id: body.work_order_id,
      starts_at: startsUtc,
      ends_at: endsUtc,
      bay: body.bay ?? null
    });
    return ok(appointment);
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: NextRequest, ctx: Params) {
  return PATCH(request, ctx);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("appointments.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const gate = await gateAppointmentByAssignee(auth.profile, id);
    if (!gate.ok) return gate.response;

    const supabase = createSupabaseAdminClient();
    const { error, count } = await supabase.from("appointments").delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    return ok({ success: Boolean(count && count > 0) });
  } catch (error) {
    return internalError(error);
  }
}
