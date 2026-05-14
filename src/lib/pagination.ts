/** Tamaño de página por defecto para listados tabulares. */
export const DEFAULT_LIST_PAGE_SIZE = 20;

/** Auditoría: filas anchas, páginas un poco más cortas. */
export const AUDIT_LIST_PAGE_SIZE = 25;

/** Catálogos en tarjetas (servicios / recompensas). */
export const CARD_GRID_PAGE_SIZE = 12;

/** Vehículos vinculados en la ficha de cliente (vista compacta). */
export const CLIENT_PROFILE_VEHICLES_PAGE_SIZE = 2;

export function parsePageParam(raw: string | string[] | undefined, fallback = 1): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = s ? Number.parseInt(s, 10) : fallback;
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export function offsetForPage(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const pages = totalPages(total, pageSize);
  return Math.min(Math.max(1, page), pages);
}
