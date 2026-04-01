# TMA platform — master task list

Cross-functional checklist aligned with the TMA strategy, architecture diagrams, and developer technical blueprint.

## Legend

- **FS** — Full-stack (Next.js + Node/TS + Drizzle `tma_custom`)
- **FE** — Frontend / design system
- **BE** — Backend / APIs / integrations
- **OPS** — DevOps / security / observability

---

## Phase 1 — MVP visitor experience (conversion)

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P1-1 | FS | Typed **block renderers** for `pages.layout` (+ stats, extended hero) |
| [x] | P1-2 | FE | **Page shell**: metadata from `seo`, primary CTA, TMA design system |
| [x] | P1-3 | FS | **Home route** renders CMS `pageType: home` when published |
| [x] | P1-4 | FE | **Framer Motion** — reveals + blur variant for testimonials |
| [x] | P1-5 | FS | **Sitemap + robots** from published `pages` |

## Phase 2 — Lead intake hardening

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P2-1 | BE | **Rate limiting** on `POST /api/forms/submit` (IP + sliding window) |
| [x] | P2-2 | BE | **Turnstile / hCaptcha** — `src/lib/captcha.ts` + optional `TurnstileWidget` |
| [x] | P2-3 | BE | **Internal email** on new lead — `INTERNAL_NOTIFY_EMAILS` + `form_configs.destination.notifyEmails` via **Resend** |
| [x] | P2-4 | BE | **Autoresponder** from `email-templates` + `email-logs` on submit |
| [x] | P2-5 | FS | **Dynamic form fields** from `form_configs.fields` JSON (`src/lib/formFields.ts`) |

## Phase 3 — Booking lifecycle

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P3-1 | BE | `POST /api/bookings/start` — internal/redirect, `absoluteUrl`, **correlationId** |
| [x] | P3-1b | FS | **Custom scheduler** — slots, confirm, `/book/[key]`, availability + `TZ` |
| [x] | P3-2 | BE | **Calendly webhook** + structured **logEvent** |
| [x] | P3-3 | BE | **Booking started** — optional `leadId` / `leadEmail` → provisional `booking-events` + lead `started` |
| [x] | P3-4 | BE | **Microsoft Bookings** — external URL on profile (same as Calendly redirect); no MS webhook in product |

## Phase 4 — CRM & automation

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P4-1 | BE | **Zoho sync** `POST /api/integrations/zoho/sync/[leadId]` + `crm-sync-logs` (skipped / success / failed) |
| [x] | P4-2 | BE | **Zoho CRM API** when `ZOHO_REFRESH_TOKEN` + client env set (`src/lib/zohoCrm.ts`); else log **skipped** |
| [x] | P4-3 | BE | **Auto sync** — `ZOHO_AUTO_SYNC=true` fires internal POST after new lead |
| [x] | P4-4 | OPS | **Replay failed** — `POST /api/integrations/zoho/replay-failed` + `x-tma-internal-secret` |

## Phase 5 — Analytics, content, scale

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P5-1 | FE | `POST /api/tracking/event` + **`trackClientEvent`** in `src/lib/clientTracking.ts` |
| [x] | P5-2 | FS | **Draft preview** — `GET /api/pages/[slug]/preview` + `INTERNAL_PREVIEW_SECRET` |
| [x] | P5-3 | FS | **Leads access** — **`admin`**, **`ops`**, and **`editor`** read/write; **`viewer`** cannot (`src/lib/console/rbac.ts`, `ConsoleAppShell`) |
| [x] | P5-4 | OPS | **Structured logs** — `src/lib/logger.ts` (`logEvent`) on lead, Zoho, Calendly, tracking |
| [x] | P5-5 | OPS | **Upstash Redis** optional (`UPSTASH_REDIS_*`) for distributed limits; **WAF** still on CDN/host |

## Phase 6 — Custom platform (`/console` + `tma_custom`)

**Roadmap note:** An earlier plan called for **Payload CMS** plus ETL / dual-write into `tma_custom`. That path was **replaced**: the product CMS is **fully custom** (JWT **`/console`**, Drizzle **`cms_*`** tables, Route Handlers). There is **no Payload dependency**, **no dual-write**, and **no** branching read layer beyond `getPageReadSource()` → **`custom`** (`src/lib/pageReadSource.ts`).

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P6-1 | FS | **`/console`** JWT auth, `admin_user`, middleware gate, Settings placeholder |
| [x] | P6-2 | BE | **`GET /api/console-auth/me`**, login **rate limit** (IP; Upstash when configured) |
| [x] | P6-3 | FS | **Read** path for first **`tma_custom`** entity: **`/console/team`** lists `admin_user` (no passwords); extend with create/edit when needed |
| [x] | P6-4 | BE | **Custom CMS as sole source of truth** — public pages and JSON APIs read **`cms_page`** (and related `cms_*`) via Drizzle only; **`getPageReadSource()`** returns **`custom`**. Supersedes former Payload + ETL item (see note above). |
| [x] | P6-6 | FS | **Layout blocks panel** in console (add / reorder / remove presets) + **`/preview/[slug]`** visual preview (`INTERNAL_PREVIEW_SECRET`) + blocks: **textMedia**, **video**, **download**, **stickyCta** |
| [x] | P6-7 | FS | **Header nav** from `navigationLabel` on published pages + static fallbacks; console **status filters**; **quick publish/archive/trash**; layout **quick edit fields**; product **JSON shape hint** |
| [x] | P6-5 | OPS | **GitHub Actions** — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml): `quality` (lint, typecheck, build) + `migrations` (Postgres service, `npm run db:custom:migrate`) |

## Phase 7 — CMS content depth & UX polish

| Status | ID | Owner | Task |
|--------|-----|-------|------|
| [x] | P7-1 | FS | **New block presets** — testimonialSlider, pricing, comparison, teamGrid, caseStudyGrid, rich, spacer added to picker + default factories + console quick fields |
| [x] | P7-2 | FS | **Spacer block** — `cms.ts` union member, preset, public renderer, console quick field for height |
| [x] | P7-3 | FE | **Block duplicate** — Duplicate button on console layout block rows (deep-clone JSON) |
| [x] | P7-4 | FS | **Structured product editor** — surface fields for hero, benefits, deliverables, pricing, FAQs, toggles (replaces raw JSON) |
| [x] | P7-5 | FS | **Media folders** — `cms_media.folder` column + console filter UI + upload with folder |
| [x] | P7-6 | FE | **Responsive images** — `tabletImageUrl` / `mobileImageUrl` on hero, imageBanner, textMedia blocks + `<picture>` / CSS media queries |
| [x] | P7-7 | FS | **CSS architecture documented** — `src/styles/CSS_ARCHITECTURE.md` (custom tokens vs Tailwind decision) |
| [x] | P7-8 | FS | **Team member library** — `cms_team_member` table + API (CRUD) + console pages + hydration for `teamGrid` blocks |
| [x] | P7-9 | FS | **Case study library** — `cms_case_study` table + API (CRUD) + console pages + hydration for `caseStudyGrid` blocks |
| [x] | P7-10 | FS | **Hero block console fields** — headline, subheadline, CTA, responsive image quick fields in layout editor |
| [x] | P7-11 | OPS | **DB migrations in sync** — `drizzle/0009` (media.folder), `drizzle/0010` (team_member + case_study) generated and applied |

## Definition of done (platform “v1”)

- [x] Published pages render block types; empty CMS sections show short editorial hints.
- [x] **CMS and console are custom** (`tma_custom` + `/console`); no Payload or parallel content store for pages.
- [x] Form submit creates leads, rate-limited, optional captcha when secrets / `spamProtection.requireCaptcha`.
- [x] Booking start (+ optional lead link), internal confirm, Calendly webhook paths coherent.
- [x] Zoho sync callable; real CRM when OAuth configured; audit in `crm-sync-logs`.
- [x] Sitemap/robots; set `NEXT_PUBLIC_SERVER_URL` per environment.

---

## Form config JSON hints

**`fields`** (optional array) — each: `{ "name": "budget", "type": "text"|"email"|"tel"|"textarea"|"url"|"checkbox", "label": "…", "required": true }`.  
If no `email` field in the array, the UI adds a required email row.

**`destination`** — `{ "notifyEmails": ["ops@example.com"] }` merged with `INTERNAL_NOTIFY_EMAILS`.

**`spamProtection`** — `{ "requireCaptcha": true }` (requires Turnstile or hCaptcha env secrets).
