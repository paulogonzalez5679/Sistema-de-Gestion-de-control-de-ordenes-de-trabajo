import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  ensureDataLayout,
  ensureDir,
  getDefaultDataDir,
  getDefaultMediaRoot,
  getSettingsFilePath,
  resolveAdminMediaPath
} from "@/lib/local-storage/paths";

export type AppStorageSettings = {
  /** Ruta absoluta donde se guardan fotos y archivos locales. Vacío = predeterminado. */
  mediaRoot: string | null;
};

const DEFAULT_SETTINGS: AppStorageSettings = { mediaRoot: null };

async function readSettingsFile(): Promise<AppStorageSettings> {
  ensureDataLayout();
  const filePath = getSettingsFilePath();
  if (!existsSync(filePath)) return { ...DEFAULT_SETTINGS };
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppStorageSettings>;
    const mediaRoot =
      typeof parsed.mediaRoot === "string" && parsed.mediaRoot.trim().length > 0
        ? parsed.mediaRoot.trim()
        : null;
    return { mediaRoot };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function getAppStorageSettings(): Promise<AppStorageSettings> {
  return readSettingsFile();
}

export async function saveAppStorageSettings(next: AppStorageSettings): Promise<AppStorageSettings> {
  ensureDataLayout();
  const mediaRoot = next.mediaRoot?.trim() ? resolveAdminMediaPath(next.mediaRoot) : null;
  if (mediaRoot) ensureDir(mediaRoot);
  const payload: AppStorageSettings = { mediaRoot };
  await writeFile(getSettingsFilePath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

/** Ruta efectiva donde se escriben las fotos (crea carpetas si faltan). */
export async function getEffectiveMediaRoot(): Promise<string> {
  const settings = await readSettingsFile();
  const root = settings.mediaRoot?.trim()
    ? resolveAdminMediaPath(settings.mediaRoot)
    : getDefaultMediaRoot();
  ensureDir(root);
  return root;
}

export async function getStorageSettingsSummary() {
  const settings = await readSettingsFile();
  const effectiveMediaRoot = await getEffectiveMediaRoot();
  return {
    settings,
    defaultDataDir: getDefaultDataDir(),
    defaultMediaRoot: getDefaultMediaRoot(),
    effectiveMediaRoot,
    settingsFile: getSettingsFilePath()
  };
}
