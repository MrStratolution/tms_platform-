# TMA platform

Backend-managed marketing and lead platform aligned with the TMA strategy (pages, blocks, unified leads, booking profiles, optional Zoho).

## Architecture (target stack)

**Product backend:** **Node.js + TypeScript** — business logic in Route Handlers (`src/app/api/`), shared modules (`src/lib/`), and **PostgreSQL** via **Drizzle** in schema **`tma_custom`** ([`src/db/`](./src/db/)). **Custom admin** at **`/console`** (JWT + `admin_user`) is the app-owned control plane. Public pages and CMS JSON live in **`tma_custom`** (`cms_page`, `cms_form_config`, etc.).

| Layer | Choice |
|--------|--------|
| **Frontend** | **Next.js** (App Router, React) — public site + **`/console`** |
| **Backend logic** | **Node.js + TypeScript** — `src/app/api/`, server components, `src/lib/` |
| **Database** | **PostgreSQL** — **`tma_custom`** (Drizzle) for app + CMS data |
| **Admin** | **`/console`** — custom panel ([`src/app/(admin)/console/`](./src/app/(admin)/console/)) |

See [`docs/CUSTOM_PLATFORM.md`](./docs/CUSTOM_PLATFORM.md) for schema and operations notes.

### How the full stack connects (local)

| Surface | Route | Backend |
|--------|--------|---------|
| **Marketing home** | `/` | Drizzle — `cms_page` (`pageType: home`, published). |
| **Other CMS pages** | `/[slug]` | Drizzle — `cms_page` by slug. |
| **Public JSON API** | `GET /api/pages/[slug]` | Node handler; JSON from `tma_custom`. |
| **Forms & booking** | `POST /api/forms/submit`, `/api/bookings/*` | **Node.js Route Handlers** + `tma_custom`. |
| **App admin** | `/console` | **Custom** — JWT + Drizzle `tma_custom.admin_user`. |
| **CMS in browser** | `/console/pages`, `/console/leads` | Edit **`cms_page`** JSON (title, status, document) and browse **`cms_lead`** rows. |
| **CMS APIs** (cookie auth) | `GET/PATCH /api/console/pages/*`, `GET /api/console/leads/*` | Same session as `/console` login. |

**Runbook** (empty home / DB / seed order): [`docs/CONSOLE_CMS_RUNBOOK.md`](./docs/CONSOLE_CMS_RUNBOOK.md).  
**Advanced:** `npm run db:custom:studio` for raw table edits.

Shared origin helper: [`src/lib/publicSiteUrl.ts`](./src/lib/publicSiteUrl.ts) (`getPublicSiteOrigin`).

**Brand UI:** The public site uses the TMA design system — black / soft lime (`#E7F8C8`) / white, **Syne** (display) + **Inter** (body) via `next/font`, grain overlay, blurred hero layers, and decorative multilingual accents. Styling is **CSS custom properties + global CSS** (not Tailwind); tokens live in [`src/styles/tma-tokens.css`](./src/styles/tma-tokens.css). See [`docs/STRATEGY_ALIGNMENT.md`](./docs/STRATEGY_ALIGNMENT.md) if your written strategy still says “Tailwind.” Layout chrome in [`src/components/tma/`](./src/components/tma/). Logo: [`public/brand/tma-logo-white.png`](./public/brand/tma-logo-white.png).

## Prerequisites

- **PostgreSQL** — **required.** Set **`DATABASE_URL`** (`postgresql://` or `postgres://`). Drizzle owns **`tma_custom`**. No SQLite/Mongo/MySQL path.
- Node.js 20+ (or 18.20+)
- Docker (optional, for the bundled local Postgres in `docker-compose.yml`)

### Browser vs database (common confusion)

- **Do not open `http://localhost:5432` in Chrome.** Port **5432** is the **PostgreSQL** port (database wire protocol), not a website — you will see **ERR_EMPTY_RESPONSE** or similar. The **app** runs on **`http://localhost:4069`** after **`npm run dev`** (or `:3000` if you use `dev:3000`).
- **Another stack on host `:5432`** (e.g. `postgres-site`) is normal. This repo’s Compose maps TMA Postgres to **host `:5443`** → **`DATABASE_URL`** must use **`127.0.0.1:5443`** (see `.env.example`). Run **`docker compose up -d`** from the **tma-platform** folder so container **`tma-platform-4069-postgres-1`** is **running** (`docker compose ps`).

### Home or `/console` won’t load

Almost always **Postgres is not reachable**, **`DATABASE_URL` is wrong**, or **`NEXT_PUBLIC_SERVER_URL` does not match the browser URL** (including port) for absolute links / previews.

| Symptom | What to do |
|--------|------------|
| Wrong links or preview origin | Set **`NEXT_PUBLIC_SERVER_URL`** to the URL you open (including port). Default: **`http://localhost:4069`** with **`npm run dev`**. For port **3000**, use **`npm run dev:3000`** and **`NEXT_PUBLIC_SERVER_URL=http://localhost:3000`**. Restart dev after changing `.env`. |
| **`Bind for 0.0.0.0:5432 failed: port is already allocated`** | Host **5432** is taken (often `postgres-site`). This repo uses **5433** on the host — pull latest **`docker-compose.yml`** + **`.env`** (`...@127.0.0.1:5433/...`), then **`docker compose down`** and **`docker compose up -d`**. |
| **`password authentication failed for user "tma"`** / `cannot connect to Postgres` | **`DATABASE_URL` may point at the wrong server** if it says **:5432** while another DB owns that port. Use **`...@127.0.0.1:5443/tma_platform_4069`** for this project’s Docker. Run **`npm run db:ping`**. Ensure **`docker compose ps`** shows **`tma-platform-4069-postgres-1`** **running**. After a failed **`docker compose up`**, run **`docker compose down`** then **`docker compose up -d`** again. |
| `ECONNREFUSED` (DB) | Start TMA Postgres: **`docker compose up -d`**, and match **`DATABASE_URL`** host port to **`docker-compose.yml`** (default **5443**). |
| Chrome **“localhost refused to connect”** on **`:4069`** | The **Next.js dev server** is not running. Run **`npm run dev`** from the project folder until **Ready**; keep that terminal open. Reload `http://localhost:4069` or `/console`. (If you use **`npm run dev:3000`**, open **`http://localhost:3000`**.) |
| CMS / build still errors after DB is up | Run **`npm run db:custom:migrate`**, then **`npm run seed`** for demo `cms_*` rows. |

This project’s Postgres listens on **host `5443`** by default so another DB can keep **`:5432`** and older TMA stacks can keep **`:5433`**. Keep **`DATABASE_URL`** in sync with **`docker-compose.yml`** `ports:`.

## Repository

From the project folder, initialize Git if you have not already:

```bash
git init
git add .
git commit -m "Initial TMA platform scaffold"
```

## Quick start

1. **Install**

   ```bash
   npm install --cache ./.npm-cache
   ```

2. **Environment** — copy [`.env.example`](./.env.example) to `.env` and adjust if needed (defaults match Docker Compose below). **`npm run setup:local`** creates `.env` from the example automatically if it is missing.

3. **Database + migrations** (creates `.env` if missing, **generates `ADMIN_SESSION_SECRET`** for `/console`, Docker Postgres, **Drizzle** `tma_custom` migrate):

   ```bash
   npm run setup:local
   ```

   Or manually: `docker compose up -d` (Postgres on **host port 5433**), then `npm run wait-for-pg`, then `npm run db:custom:migrate`. If you created `.env` by hand, run **`npm run ensure-console-secret`** (JWT for `/console`) and **`npm run ensure-preview-secret`** (draft preview + responsive preview in the page editor). Use your own Postgres by setting `DATABASE_URL` and skipping `db:up`.

4. **Validate env** (optional):

   ```bash
   npm run check:local-env
   ```

   **Share config safely** (redacted — paste into chat or tickets): `npm run env:report`

**Scripts:** `npm run db:up` / `npm run db:down` — start/stop Compose Postgres only.

5. **Seed** — migration checkpoint + demo CMS rows (pages, contact form, booking profile, email templates) when `lead-thanks` is not already present:

   ```bash
   npm run seed
   ```

   Use `npm run seed -- --force` to append another migration checkpoint and replace demo CMS rows (see `scripts/seed-cms-demo.ts`).

6. **Dev server** (defaults to **port 4069** — matches `.env.example`)

   ```bash
   npm run dev
   ```

   Leave this process running; closing the terminal or stopping it causes **connection refused** in the browser until you start `npm run dev` again.

   For the default Next port **3000** instead: `npm run dev:3000` and set **`NEXT_PUBLIC_SERVER_URL=http://localhost:3000`** in `.env`.

7. **Custom admin (`/console`)** — After **`npm run setup:local`**, `.env` should include **`ADMIN_SESSION_SECRET`** (or run **`npm run ensure-console-secret`**). Create a console user: `npm run create-console-admin -- you@company.com 'secure-password'`. Open [http://localhost:4069/console/login](http://localhost:4069/console/login). Then use **`/console/pages`** to edit marketing content and **`/console/leads`** to inspect submissions (see [`docs/CONSOLE_CMS_RUNBOOK.md`](./docs/CONSOLE_CMS_RUNBOOK.md)).

8. **Public site** — After **`npm run seed`**, open [http://localhost:4069/](http://localhost:4069/) and [http://localhost:4069/book/strategy-call](http://localhost:4069/book/strategy-call).

## Lint, types, and build

Run these **exactly** (no extra words after them). The long dash `—` is typography in prose, **not** part of shell commands; only use ASCII `-` for flags like `--noEmit`.

```bash
npm run lint
npm run typecheck
npm run build
```

(`typecheck` runs `tsc --noEmit`.)

**Lockfile warning:** If Next reports multiple `package-lock.json` files, npm is picking up an extra lockfile (often in your user home folder). Keep a single lockfile for this project (the one in the repo root) and remove or rename the stray copy.

**Stale build:** If the dev server errors on a missing chunk, run `npm run clean` (deletes `.next`), then `npm install` and `npm run dev` or `npm run build`.

## Project layout

| Area | Path |
|------|------|
| **Node/TS backend** | [`src/app/api/`](./src/app/api/) — Route Handlers; [`src/lib/`](./src/lib/) — shared logic |
| **App-owned DB** | [`src/db/`](./src/db/) — Drizzle schema **`tma_custom`**; [`docs/CUSTOM_PLATFORM.md`](./docs/CUSTOM_PLATFORM.md) |
| **Custom admin** | [`src/app/(admin)/console/`](./src/app/(admin)/console/) — `/console`, `/console/login`, `/console/pages`, `/console/leads`, `/console/team`, `/console/settings`, `/console/team-members`, `/console/case-studies` |
| **Console JSON APIs** | [`src/app/api/console/`](./src/app/api/console/) — pages, leads, team-members, case-studies, testimonials, faq-entries, media, products, etc. (JWT cookie) |
| Public site (App Router) | [`src/app/(frontend)/`](./src/app/(frontend)/) |
| CMS types | [`src/types/cms.ts`](./src/types/cms.ts) — document shapes for pages/blocks |
| Public & integration APIs | `GET /api/pages/[slug]`, `GET /api/pages/[slug]/preview`, `GET /api/platform/health`, `POST /api/forms/submit`, `POST /api/bookings/*`, `POST /api/tracking/event`, Zoho + AI + A/B routes (see repo tree) |
| CI | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — lint, typecheck, build; Postgres job runs **`db:custom:migrate`** |
| Public UI | [`src/components/blocks/`](./src/components/blocks/) (layout blocks + Framer Motion `Reveal`), [`src/components/pages/PageView.tsx`](./src/components/pages/PageView.tsx) |
| SEO | [`src/app/sitemap.ts`](./src/app/sitemap.ts) (dynamic, DB at runtime), [`src/app/robots.ts`](./src/app/robots.ts) |

## Booking providers

- **Custom (built-in)** — default. Editors set **Custom (built-in)** on a booking profile, optional **public book path slug**, duration, and JSON **availability**. Visitors use `/book/{slug-or-id}`; slots come from `GET /api/bookings/slots`, confirmation from `POST /api/bookings/confirm` (creates a lead + `booking-events` row). Set server **`TZ`** so business hours match your region.
- **Calendly** or **Microsoft Bookings** — optional. Set provider and **external booking URL**. `POST /api/bookings/start` returns `mode: "redirect"` and the URL. Calendly-only: `POST /api/bookings/webhook/calendly` + `CALENDLY_WEBHOOK_SIGNING_KEY`.

## NPM cache note

If `npm install` fails on `~/.npm` permissions, use a project cache:

```bash
npm install --cache ./.npm-cache
```

## CMS content model

Layout blocks include **Hero**, **CTA**, **Proof bar**, **Testimonials**, **Stats**, **Form**, **Booking**, **FAQ**, **Rich text**, **Team grid**, **Case study grid**, **Pricing**, **Comparison table**, **Process / timeline**, **Image banner**, **Text + Media**, **Video**, **Download**, **Sticky CTA**, and **Spacer**. Page-level **hero** supports blurred background media (URLs under `/public` or absolute). Image-heavy blocks (hero, imageBanner, textMedia) support **responsive image overrides** (`tabletImageUrl`, `mobileImageUrl`) rendered via `<picture>` element or CSS media queries. Rows live in **`tma_custom.cms_page`** (JSON `document` column) and related tables (`cms_team_member`, `cms_case_study`, `cms_testimonial`, `cms_faq_entry`, `cms_download_asset`, `cms_layout_block`).

**Block duplicate** — each block row in the console layout editor has a **Duplicate** button that deep-clones the block JSON.

**Media folders** — uploaded media can be tagged with a `folder` for organization; filter by folder in `/console/media`.

### AI-assisted marketing copy (optional)

Set **`TMA_AI_API_KEY`** (preferred) or **`OPENAI_API_KEY`**. Optional **`TMA_AI_BASE_URL`** defaults to OpenAI’s API; use an OpenAI-compatible base URL for LM Studio, Ollama, Groq, etc. **`TMA_AI_MODEL`** (or **`OPENAI_MODEL`**) selects the model. Cursor IDE does not expose a server API for its chat models—use a provider or local OpenAI-compatible server.

1. **Server / scripts** — `POST /api/integrations/ai/generate-copy` with header **`x-tma-internal-secret: <INTERNAL_API_SECRET>`** and JSON `{ "brief": { … } }`.
2. **Console** — use the AI tools in `/console` where wired.

Admin routes (session cookie): **`POST /api/admin/ai/generate-copy`**, **`POST /api/admin/ai/localize-page`** `{ "pageId", "limit?" }`.

### A/B tests

- Table **`tma_custom.cms_ab_variant`**: one row per arm (A/B), optional overlays for hero, primary CTA, SEO; **`weight`** drives traffic when using the assign API.
- Visitors: cookie **`tma_ab_{slug}_default`** (set by **`?tma_variant=a|b`** via middleware, or **`POST /api/ab/assign`** with body `{ "pageSlug": "home" }` when **`NEXT_PUBLIC_AB_ASSIGN_API=1`**).
- Public pages merge the winning arm before render (and for metadata).

### Localization jobs

- Table **`tma_custom.cms_page_localization`** stores translated hero, SEO, and **`layout_json`** (full layout) per locale (`jobStatus`: queued → running → ready / failed).
- **Workers**: cron should call **`POST /api/integrations/ai/run-localization-jobs`** with **`x-tma-internal-secret`** (batch). Use the console AI tools where available.

### Licensed display fonts (optional)

Place WOFF2 files in **`public/fonts/`** as listed in **`public/fonts/PLACE_LICENSED_FONTS_HERE.txt`**, then paste the **`@font-face`** block from the comment template in **`src/styles/tma-licensed-fonts.css`**. Until you do, the stack in **`tma-tokens.css`** falls through to **Syne / Inter** with **no** font 404s.

## Go live (production)

**Detailed steps** (Postgres providers, migrate command, smoke tests, Calendly/Zoho): [`docs/PROVISION_PRODUCTION.md`](./docs/PROVISION_PRODUCTION.md).

Quick helpers:

```bash
npm run gen:production-env    # writes .env.production.generated with new secrets (gitignored)
npm run db:custom:migrate   # app schema tma_custom (always)
npm run check:production-env  # optional: validate .env / .env.production.local
```

Use this order on your host (Vercel, Fly, Railway, Docker, etc.):

1. **Database** — Managed Postgres (or Docker) reachable from the app. Set **`DATABASE_URL`** (SSL params if required by the provider).
2. **Secrets** — **`ADMIN_SESSION_SECRET`** for **`/console`** (≥32 chars). Set other vars from [`.env.example`](./.env.example) as needed: **`NEXT_PUBLIC_SERVER_URL`**, **`RESEND_*`**, **`INTERNAL_API_SECRET`**, **`INTERNAL_PREVIEW_SECRET`**, Zoho, Calendly, Turnstile, **Upstash** (`UPSTASH_REDIS_*`).
3. **Migrate** — **`npm run db:custom:migrate`** on each deploy that ships new SQL under `drizzle/`.
4. **Build** — **`npm run build`** in CI; start with **`npm start`** (or your platform’s Next start command). Use **Node 20+** (or 18.20+).
5. **Admin access** — Create **`/console`** users via your deploy process (`create-console-admin` or SQL).
6. **Smoke test** — `/`, **`/console/login`**, one **`/[slug]`**, optional **`/book/...`**, test form submit.
7. **DNS & TLS** — Point domain to the host; enable HTTPS (usually automatic on Vercel / behind Cloudflare).
8. **Integrations** — Update **Calendly** webhook URL and **Zoho** redirect URIs to **production** domains if applicable.
9. **Content** — Seed or insert rows into **`tma_custom`** (`npm run seed` for demo); manage ongoing content via your workflows or SQL/tools.
10. **Lockfile** — One **`package-lock.json`** for this repo (avoid a stray lockfile in your home directory so installs are deterministic).

Then follow **Optional production hardening** below (WAF, logs, monitoring).

## Optional production hardening

- **WAF** — configure at your CDN (e.g. Cloudflare) or load balancer
- **Log shipping** — ship `logEvent` JSON lines to your log stack

**Rate limits** — `POST /api/forms/submit` and `POST /api/bookings/confirm` share `FORM_RATE_LIMIT_*`. Set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** for distributed limits (see [`.env.example`](./.env.example)).

**Booking confirmation** — on **Custom (built-in)** profiles, optional **Confirmation email** template (`cms_email_template`); vars: `{{scheduledFor}}`, `{{bookingProfileName}}`, `{{durationMinutes}}`, `{{slotEnd}}`, plus lead fields.

**Preview** — Draft JSON: `GET /api/pages/[slug]/preview` (secured). **`NEXT_PUBLIC_SERVER_URL`** should match the site origin for absolute media and links.

**Email** uses [Resend](https://resend.com) when `RESEND_API_KEY` is set. **Captcha**: Turnstile or hCaptcha secrets + optional `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the widget.

Full checklist: [`docs/TASK_LIST.md`](./docs/TASK_LIST.md).
