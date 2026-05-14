import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Conflicto de negocio (p. ej. cédula duplicada). No exponer detalles internos en `extras`. */
export function conflict(message: string, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status: 409 });
}

export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function internalError(error: unknown) {
  // Secure SQL / error-handling rules: never expose DB or stack details to API clients.
  console.error("[api] internal error", error);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}
