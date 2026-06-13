export const ORDER_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/png": ".png"
};

export function detectImageExt(buffer: Buffer): { ext: string; mimeType: string } | null {
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

export function parseBase64ImagePayload(base64Data: string): Buffer | null {
  const trimmed = base64Data.trim();
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  const raw = dataUrlMatch ? dataUrlMatch[2] : trimmed;
  if (!raw || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) return null;
  try {
    return Buffer.from(raw.replace(/\s/g, ""), "base64");
  } catch {
    return null;
  }
}

export function validateOrderImageBuffer(buffer: Buffer): { mimeType: string } | { error: string } {
  if (buffer.length > ORDER_IMAGE_MAX_BYTES) {
    return { error: "La imagen debe pesar menos de 3 MB." };
  }
  const detected = detectImageExt(buffer);
  if (!detected) {
    return { error: "Solo se permiten imágenes JPEG, PNG o WebP." };
  }
  return { mimeType: detected.mimeType };
}

export function isAllowedImageMime(mime: string): boolean {
  return mime in ALLOWED_MIME;
}
