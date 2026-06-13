import { NextRequest } from "next/server";
import { badRequest, internalError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/permissions";
import {
  getStorageSettingsSummary,
  saveAppStorageSettings
} from "@/lib/local-storage/settings";
import { resolveAdminMediaPath } from "@/lib/local-storage/paths";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

export async function GET() {
  try {
    const auth = await requirePermission("settings.manage");
    if ("denied" in auth) return auth.denied;
    const summary = await getStorageSettingsSummary();
    return ok(summary);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission("settings.manage");
    if ("denied" in auth) return auth.denied;

    const body = (await request.json()) as { mediaRoot?: string | null };
    const mediaRoot =
      body.mediaRoot === null || body.mediaRoot === undefined
        ? null
        : typeof body.mediaRoot === "string"
          ? body.mediaRoot
          : null;

    if (mediaRoot !== null && !mediaRoot.trim()) {
      return badRequest("Indique una ruta absoluta o use la predeterminada.");
    }

    if (mediaRoot?.trim()) {
      const resolved = resolveAdminMediaPath(mediaRoot);
      try {
        await access(resolved, constants.W_OK);
      } catch {
        try {
          const { mkdir } = await import("node:fs/promises");
          await mkdir(resolved, { recursive: true });
        } catch {
          return badRequest(
            "No se puede escribir en esa ruta. Verifique permisos o elija otra carpeta."
          );
        }
      }
    }

    await saveAppStorageSettings({ mediaRoot: mediaRoot?.trim() ? mediaRoot.trim() : null });
    const summary = await getStorageSettingsSummary();
    return ok(summary);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ruta")) {
      return badRequest(error.message);
    }
    return internalError(error);
  }
}
