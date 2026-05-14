import { NextRequest } from "next/server";
import { badRequest, internalError, notFound, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { getProfileByUserId } from "@/modules/profiles/profile.service";

const VALID_PROFILE_ROLES = ["admin", "manager", "operator", "detailer"] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("profiles.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const profile = await getProfileByUserId(id);
    if (!profile) return notFound("Profile");
    return ok(profile);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("profiles.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const body = await request.json();

    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const role = body.role as string | undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    if (role !== undefined && !(VALID_PROFILE_ROLES as readonly string[]).includes(role)) {
      return badRequest(`role must be one of: ${VALID_PROFILE_ROLES.join(", ")}`);
    }

    const supabase = createSupabaseAdminClient();

    const authUpdates: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, string>;
      app_metadata?: Record<string, string>;
    } = {};
    if (email !== undefined) authUpdates.email = email;
    if (password !== undefined && password.length > 0 && password.length < 12) {
      return badRequest("La contraseña debe tener al menos 12 caracteres.");
    }
    if (password !== undefined && password.length >= 12) authUpdates.password = password;
    if (full_name !== undefined) authUpdates.user_metadata = { full_name };
    if (role !== undefined) authUpdates.app_metadata = { role };

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, authUpdates);
      if (authErr) throw authErr;
    }

    const rowPayload: Record<string, unknown> = {};
    if (full_name !== undefined) rowPayload.full_name = full_name;
    if (email !== undefined) rowPayload.email = email;
    if (role !== undefined) rowPayload.role = role;

    if (Object.keys(rowPayload).length > 0) {
      const { data, error } = await supabase.from("profiles").update(rowPayload).eq("id", id).select("*").single();
      if (error) throw error;
      const actor = auth.profile;
      await recordAuditEvent({
        actorId: actor.id,
        action: "user.updated",
        entityType: "profile",
        entityId: id,
        workOrderId: null,
        summary: `${actor.full_name} actualizó el usuario «${data.full_name}».`,
        metadata: { profile_id: id, fields: Object.keys(rowPayload) }
      });
      return ok(data);
    }

    const profile = await getProfileByUserId(id);
    if (!profile) return notFound("Profile");
    return ok(profile);
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requirePermission("profiles.manage");
    if ("denied" in auth) return auth.denied;

    const { id } = await params;
    const session = auth.profile;
    if (session.id === id) {
      return badRequest("No puedes eliminar tu propio usuario.");
    }

    const victim = await getProfileByUserId(id);
    if (!victim) return notFound("Profile");

    const supabase = createSupabaseAdminClient();

    const { error: delAuth } = await supabase.auth.admin.deleteUser(id);
    if (delAuth) throw delAuth;

    await supabase.from("profiles").delete().eq("id", id);

    await recordAuditEvent({
      actorId: session.id,
      action: "user.deleted",
      entityType: "profile",
      entityId: id,
      workOrderId: null,
      summary: `${session.full_name} eliminó al usuario «${victim.full_name}».`,
      metadata: { profile_id: id }
    });

    return ok({ success: true });
  } catch (error) {
    return internalError(error);
  }
}
