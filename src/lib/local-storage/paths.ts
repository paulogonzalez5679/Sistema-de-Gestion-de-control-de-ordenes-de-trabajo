import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Carpeta de datos fuera del proyecto (hermana al cwd del servidor / paquete Windows). */
export function getDefaultDataDir(): string {
  const fromEnv = process.env.KENZO_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "..", "KenzoStudioData");
}

export function getConfigDir(): string {
  return path.join(getDefaultDataDir(), "config");
}

export function getSettingsFilePath(): string {
  return path.join(getConfigDir(), "settings.json");
}

export function getDefaultMediaRoot(): string {
  return path.join(getDefaultDataDir(), "media");
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function ensureDataLayout(): void {
  ensureDir(getConfigDir());
  ensureDir(getDefaultMediaRoot());
}

/** Valida y normaliza una ruta absoluta propuesta por el administrador. */
export function resolveAdminMediaPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("La ruta no puede estar vacía.");
  const resolved = path.resolve(trimmed);
  if (resolved.includes("..")) {
    throw new Error("La ruta no es válida.");
  }
  return resolved;
}

export function orderIntakeDir(mediaRoot: string, orderId: string): string {
  return path.join(mediaRoot, "orders", orderId, "before");
}

export function orderIntakeManifestPath(mediaRoot: string, orderId: string): string {
  return path.join(mediaRoot, "orders", orderId, "intake.json");
}
