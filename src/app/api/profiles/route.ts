import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/modules/audit/audit.service";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

const VALID_PROFILE_ROLES = ["admin", "manager", "operator", "detailer"] as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("profiles.manage");
    if ("denied" in auth) return auth.denied;

    const role = request.nextUrl.searchParams.get("role");
    if (role !== null && role !== "" && !(VALID_PROFILE_ROLES as readonly string[]).includes(role)) {
      return badRequest("El parámetro role no es válido.");
    }

    const supabase = createSupabaseAdminClient();
    let query = supabase.from("profiles").select("*").order("full_name", { ascending: true });
    if (role) query = query.eq("role", role);
    const { data, error } = await query;
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("profiles.manage");
    if ("denied" in auth) return auth.denied;

    const body = await request.json();
    if (!body?.full_name || !body?.email) {
      return badRequest("full_name and email are required");
    }

    const role = body.role ?? "operator";
    if (!VALID_PROFILE_ROLES.includes(role)) {
      return badRequest(`role must be one of: ${VALID_PROFILE_ROLES.join(", ")}`);
    }

    const supabase = createSupabaseAdminClient();
    let userId: string;
    let authUserCreated = false;

    if (body.id) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(body.id);
      if (userError) throw userError;
      if (!userData.user) {
        return badRequest("The provided id does not exist in auth.users.");
      }
      userId = userData.user.id;
    } else {
      if (!body.password || typeof body.password !== "string" || body.password.length < 12) {
        return badRequest("password is required when id is not provided (minimum 12 characters)");
      }

      const { data: createdUserData, error: createUserError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name
        },
        app_metadata: {
          role
        }
      });
      if (createUserError) throw createUserError;
      if (!createdUserData.user) {
        return badRequest("Could not create auth user");
      }
      userId = createdUserData.user.id;
      authUserCreated = true;
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: body.full_name,
        email: body.email,
        role
      })
      .select("*")
      .single();
    if (error) throw error;
    const actor = auth.profile;
    await recordAuditEvent({
      actorId: actor.id,
      action: "user.created",
      entityType: "profile",
      entityId: data.id,
      workOrderId: null,
      summary: `${actor.full_name} dio de alta al usuario «${data.full_name}» (${data.email}).`,
      metadata: { profile_id: data.id, role: data.role, auth_user_created: authUserCreated }
    });
    return ok({ ...data, auth_user_created: authUserCreated }, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
