# AutoDetail SaaS Pro

Production-oriented Next.js + Supabase implementation generated from Stitch screens.

**Guía para instalar, requisitos y comandos (usuario / TI):** [docs/guia-ejecucion-usuario.md](docs/guia-ejecucion-usuario.md)

**Paquete Windows sin código fuente (standalone):** [docs/instalacion-windows-standalone.md](docs/instalacion-windows-standalone.md) — generar con `npm run package:win`.

## Stack
- Next.js App Router
- TypeScript
- Supabase (Auth + Postgres + Storage-style image persistence via base64 table)

## Setup (resumen)

1. Sigue la **[guía de ejecución](docs/guia-ejecucion-usuario.md)** (requisitos, Supabase, `.env`, LAN, FAQ).
2. En breve: `npm install` → copiar `.env` desde `.env.example` → aplicar `supabase/schema.sql` y migraciones en orden en el SQL Editor de Supabase → `npm run dev` o `npm run dev:lan`.

## Structure
- `src/app/api/*` REST routes for CRUD and workflow endpoints
- `src/modules/*` service layer per module
- `src/app/(dashboard)/*` connected UI pages
- `src/lib/*` shared supabase clients and types

## Stitch exports
- Downloaded assets are in:
  - `stitch-assets/screens/*.png`
  - `stitch-assets/html/*.html`
- Analysis and inferred data model:
  - `docs/stitch-analysis.md`
