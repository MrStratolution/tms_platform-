# Console, public pages, and CMS data (runbook)

Use this when **`/`** shows the fallback hub (no CMS home) or when setting up a new environment.

## 1. Postgres and `DATABASE_URL`

- Start the bundled DB: `npm run db:up` then `npm run wait-for-pg` (or your own Postgres).
- In `.env`, `DATABASE_URL` must point at **this** database. The Docker Compose profile in this repo maps Postgres to host port **5433** by default — see [`.env.example`](../.env.example).

## 2. Apply Drizzle migrations

```bash
npm run db:custom:migrate
```

This creates `tma_custom` tables including `cms_page`, `cms_lead`, `cms_form_config`, etc.  
If `npm run seed` failed with **relation `tma_custom.cms_*` does not exist**, migrations were not applied.

## 3. Seed demo CMS rows (optional but typical for local dev)

```bash
npm run seed
```

- Inserts a migration checkpoint row (if needed) and demo **email templates**, **contact form**, **booking profile**, and **published pages** (`home`, `services`, `contact`, `thanks`) via [`scripts/seed-cms-demo.ts`](../scripts/seed-cms-demo.ts).
- Skips CMS demo if an email template with slug `lead-thanks` already exists. To replace demo content: `npm run seed -- --force`.

## 4. Confirm a published home page exists

In SQL or Drizzle Studio (`npm run db:custom:studio`):

```sql
SELECT id, slug, page_type, status, title
FROM tma_custom.cms_page
WHERE page_type = 'home' AND status = 'published';
```

You should see at least one row (after seed, `slug = 'home'`).

## 5. Console sign-in

1. `ADMIN_SESSION_SECRET` in `.env` (≥32 characters): `npm run ensure-console-secret`
2. Create a user: `npm run create-console-admin -- you@company.com 'secure-password'`
3. Open `/console/login` and sign in.

## 6. Edit content and inspect leads in the browser

- **Pages:** `/console/pages` — list and JSON editor for each page’s `document` (and quick metadata).
- **Leads:** `/console/leads` — list and detail.

For raw table access without the UI, use **Drizzle Studio** (`npm run db:custom:studio`).

## 7. Still broken?

- Restart `npm run dev` after changing `.env`.
- Confirm the app and CLI use the **same** `DATABASE_URL` (no mixed 5432 vs 5433).
- Check server logs when loading `/` for database errors.
