import { forbidden } from "@/lib/api-response";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

/**
 * Helper legacy. Las rutas nuevas deben usar `requirePermission` (matriz central
 * en `src/lib/permissions.ts`), que devuelve también el perfil y unifica el manejo de
 * 401/403. Este helper queda como puente para código antiguo.
 */
export async function assertAdminOnly(): Promise<Response | null> {
  const profile = await getSessionProfile();
  if (!canManageUsers(profile?.role)) {
    return forbidden("Solo los administradores pueden realizar esta acción.");
  }
  return null;
}
