# Custom platform (Node.js / TypeScript + Drizzle)

The product stack is **Next.js Route Handlers + `src/lib/` + PostgreSQL (`tma_custom` via Drizzle) + `/console`**. Public pages and CMS JSON are stored in **`tma_custom`** (`cms_page`, `cms_form_config`, `cms_booking_profile`, etc.). **Payload CMS is not used**; there is no ETL from Payload—this schema and **`/console`** are the editorial system.

## Parallel delivery (three workstreams)

When automating work in parallel, split by **merge surface** so agents do not fight the same files:

1. **Backend / API** — `src/app/api/`, `src/lib/`, `src/db/schema.ts` + `drizzle/` migrations.
2. **Console UI** — `src/app/(admin)/`, `src/components/console/`, `src/styles/tma-console.css`.
3. **Ops / docs** — `README.md`, `docs/PROVISION_PRODUCTION.md`, `.env.example`, scripts under `scripts/`.

If sub-agent tasks fail to spawn in your IDE, run those streams as separate human or CI jobs with the same boundaries.

## Stack

- **Frontend:** Next.js (public site + custom admin UI at **`/console`**).
- **Styling:** **CSS design tokens** (`tma-tokens.css`, `tma-console.css`) + Framer Motion — **not Tailwind** (see [`STRATEGY_ALIGNMENT.md`](./STRATEGY_ALIGNMENT.md)).
- **Backend:** Node.js + TypeScript (Route Handlers, `src/lib/`, integrations).
- **Database:** PostgreSQL — **`tma_custom`** (Drizzle) for app + CMS data.
- **Admin:** **`/console`** (JWT + `admin_user`, role-based access for writes).

## What is in the repo

- **`tma_custom` PostgreSQL schema** — owned by the app (Drizzle).
- **`src/db/`** — Drizzle schema + `getCustomDb()`.
- **Migrations** — `drizzle/` SQL; apply with **`npm run db:custom:migrate`** (also chained in **`npm run setup:local`**).
- **Health** — `GET /api/platform/health` confirms the custom schema is migrated (`customPlatform: ready`).
- **Demo content** — `npm run seed` runs `scripts/seed-cms-demo.ts` (skips if `lead-thanks` email template exists unless `--force`).
- **Console CMS UI** — after `/console/login`, use **`/console/pages`** (edit `cms_page` document JSON) and **`/console/leads`**. Runbook: [`CONSOLE_CMS_RUNBOOK.md`](./CONSOLE_CMS_RUNBOOK.md).

**Note:** `drizzle-orm` is pinned to **`0.44.7`** for compatibility with the chosen kit; bump only with a full `npm run typecheck` / `npm run build` pass.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run db:custom:generate` | New migration after editing `src/db/schema.ts` |
| `npm run db:custom:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:custom:push` | Dev-only push schema (use migrations for prod) |
| `npm run db:custom:studio` | Drizzle Studio (local debugging) |

Production: run **`npm run db:custom:migrate`** whenever you deploy migration files under `drizzle/`.
