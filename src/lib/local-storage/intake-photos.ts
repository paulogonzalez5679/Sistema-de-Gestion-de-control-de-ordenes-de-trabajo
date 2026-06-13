import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  orderIntakeDir,
  orderIntakeManifestPath,
  ensureDir
} from "@/lib/local-storage/paths";
import { getEffectiveMediaRoot } from "@/lib/local-storage/settings";

export const INTAKE_MIN_PHOTOS = 1;
export const INTAKE_MAX_PHOTOS = 5;
export const INTAKE_MAX_BYTES = 3 * 1024 * 1024;

export type IntakePhotoMeta = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type OrderIntakeManifest = {
  orderId: string;
  intakeConditionNotes: string;
  photos: IntakePhotoMeta[];
  updatedAt: string;
};

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/png": ".png"
};

function detectImageExt(buffer: Buffer): { ext: string; mimeType: string } | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: ".jpg", mimeType: "image/jpeg" };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: ".png", mimeType: "image/png" };
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: ".webp", mimeType: "image/webp" };
  }
  return null;
}

function safeFilename(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes("..");
}

export function intakePhotoPublicUrl(orderId: string, filename: string): string {
  return `/api/media/orders/${encodeURIComponent(orderId)}/before/${encodeURIComponent(filename)}`;
}

export async function saveOrderIntake(params: {
  orderId: string;
  intakeConditionNotes: string;
  files: { buffer: Buffer; declaredMime?: string }[];
}): Promise<OrderIntakeManifest> {
  const notes = params.intakeConditionNotes.trim();
  if (notes.length < 3) {
    throw new Error("Los detalles de ingreso son obligatorios (mínimo 3 caracteres).");
  }
  if (params.files.length < INTAKE_MIN_PHOTOS) {
    throw new Error(`Debe subir al menos ${INTAKE_MIN_PHOTOS} foto de ingreso.`);
  }
  if (params.files.length > INTAKE_MAX_PHOTOS) {
    throw new Error(`Máximo ${INTAKE_MAX_PHOTOS} fotos de ingreso.`);
  }

  const mediaRoot = await getEffectiveMediaRoot();
  const intakeDir = orderIntakeDir(mediaRoot, params.orderId);
  ensureDir(intakeDir);

  const photos: IntakePhotoMeta[] = [];
  let index = 1;

  for (const file of params.files) {
    if (file.buffer.length > INTAKE_MAX_BYTES) {
      throw new Error("Cada foto debe pesar menos de 3 MB.");
    }
    const detected = detectImageExt(file.buffer);
    if (!detected) {
      throw new Error("Solo se permiten imágenes JPEG, PNG o WebP.");
    }
    if (file.declaredMime && !ALLOWED_MIME[file.declaredMime]) {
      throw new Error("Tipo de imagen no permitido.");
    }
    const filename = `${String(index).padStart(2, "0")}${detected.ext}`;
    const fullPath = path.join(intakeDir, filename);
    await writeFile(fullPath, file.buffer);
    photos.push({
      filename,
      mimeType: detected.mimeType,
      sizeBytes: file.buffer.length,
      uploadedAt: new Date().toISOString()
    });
    index += 1;
  }

  const manifest: OrderIntakeManifest = {
    orderId: params.orderId,
    intakeConditionNotes: notes,
    photos,
    updatedAt: new Date().toISOString()
  };

  await writeFile(
    orderIntakeManifestPath(mediaRoot, params.orderId),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return manifest;
}

export async function getOrderIntake(orderId: string): Promise<OrderIntakeManifest | null> {
  const mediaRoot = await getEffectiveMediaRoot();
  const manifestPath = orderIntakeManifestPath(mediaRoot, orderId);
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = await readFile(manifestPath, "utf8");
    return JSON.parse(raw) as OrderIntakeManifest;
  } catch {
    return null;
  }
}

export async function readIntakePhotoFile(
  orderId: string,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!safeFilename(filename)) return null;
  const mediaRoot = await getEffectiveMediaRoot();
  const fullPath = path.join(orderIntakeDir(mediaRoot, orderId), filename);
  if (!existsSync(fullPath)) return null;
  const buffer = await readFile(fullPath);
  const detected = detectImageExt(buffer);
  return {
    buffer,
    mimeType: detected?.mimeType ?? "application/octet-stream"
  };
}

export async function listIntakeFilenames(orderId: string): Promise<string[]> {
  const mediaRoot = await getEffectiveMediaRoot();
  const dir = orderIntakeDir(mediaRoot, orderId);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter(safeFilename);
}
