import { internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

/**
 * Listado mínimo de staff para asignar órdenes (cualquier usuario autenticado).
 * No expone emails; el listado completo de perfiles sigue restringido a administradores.
 */
export async function GET() {
  try {
    const auth = await requirePermission("profiles.read_staff_list");
    if ("denied" in auth) return auth.denied;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("profiles").select("id, full_name, role").order("full_name", { ascending: true });
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return internalError(error);
  }
}
