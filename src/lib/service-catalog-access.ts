import { forbidden } from "@/lib/api-response";
import { canManageServiceCatalog } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";

/**
 * Helper legacy. Para rutas nuevas usa `requirePermission("services.manage")`
 * (matriz central en `src/lib/permissions.ts`).
 */
export async function assertServiceCatalogAccess(): Promise<Response | null> {
  const profile = await getSessionProfile();
  if (!canManageServiceCatalog(profile?.role)) {
    return forbidden("No tienes permiso para esta acción.");
  }
  return null;
}
