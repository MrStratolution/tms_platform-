# Provision production (step-by-step)

**Stack:** Production runs **Node.js/TypeScript** (Next.js) with **Drizzle `tma_custom`**, CMS data in the same schema, and **`/console`** for admin.

Do these in order. This repo cannot create cloud resources for you; use your provider’s dashboard where noted.

## 1. Create Postgres

Pick one (or your own managed Postgres):

| Provider | Notes |
|----------|--------|
| [Neon](https://neon.tech) | Serverless, copy **connection string** with `?sslmode=require` |
| [Supabase](https://supabase.com) | Database → **Connection string** (URI, transaction mode) |
| [Railway](https://railway.app) | New **PostgreSQL** plugin → **Variables** → `DATABASE_URL` |
| [AWS RDS](https://aws.amazon.com/rds/postgresql/) | Create instance, allow inbound from your app, use TLS |

**Allow inbound** from your hosting provider’s IPs (or “public” with strong password + SSL if the platform requires it).

---

## 2. Generate secrets and a template file

From the project root:

```bash
npm run gen:production-env
```

This creates **`.env.production.generated`** (gitignored) with:

- `ADMIN_SESSION_SECRET` (hex, for **`/console`** JWT)
- `INTERNAL_API_SECRET` and `INTERNAL_PREVIEW_SECRET` (new random)
- Empty placeholders for `DATABASE_URL` and `NEXT_PUBLIC_SERVER_URL`

Edit that file: paste your **real** `DATABASE_URL` and set `NEXT_PUBLIC_SERVER_URL` to your **exact** public URL, e.g. `https://www.yourdomain.com` (no trailing slash).

Copy every line you need into your host’s **Environment variables** (Vercel Project Settings → Environment Variables, Railway Variables, etc.).

---

## 3. Run migrations against production

With production `DATABASE_URL` available in the shell (never commit it):

```bash
export DATABASE_URL='postgresql://...'
npm run db:custom:migrate
```

The second command applies Drizzle migrations for the app-owned **`tma_custom`** schema (custom `/console` admin tables). Run it whenever new files appear under `drizzle/`.

**Custom console (`/console`)** — set a long **`ADMIN_SESSION_SECRET`** (≥32 characters) in production env. After first deploy, create a console user from a secure shell: `npm run create-console-admin -- ops@yourdomain.com '...'` (or insert via SQL). Use **Upstash** (`UPSTASH_REDIS_*`) so sign-in rate limits work across serverless instances (see §6).

Or run the same migrate commands in a one-off **release job** / **SSH** session on the host before traffic hits the new version.

---

## 4. Build and run

```bash
npm ci
npm run build
npm start
```

On **Vercel**: connect the repo; set env vars for **Production**; build command `npm run build`, output `.next` with default Next preset. Run **`npm run db:custom:migrate`** in CI or a post-deploy job whenever `drizzle/` changes.

---

## 5. Smoke tests (production)

1. Open `/` — CMS home or fallback hub.
2. Open one **`/page-slug`** you published.
3. Open **`/console/login`** — custom admin (after `ADMIN_SESSION_SECRET` + `create-console-admin`).
4. Optional: **`/book/your-slug`** internal booking.
5. Submit a **test form**; confirm lead in console or DB; delete test lead if you want.
6. **Live preview**: `NEXT_PUBLIC_SERVER_URL` must match how users open the site (same scheme + host).

---

## 6. Upstash (multiple instances / Vercel)

If you run **more than one** Node process or serverless functions:

1. Create a Redis database at [Upstash](https://upstash.com).
2. Set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** in production env.
3. Form and booking rate limits then use Redis instead of in-memory only.

---

## 7. Calendly and Zoho (if used)

- **Calendly**: Webhook URL must point to **`https://your-domain.com/api/bookings/webhook/calendly`** (or your real domain). Set **`CALENDLY_WEBHOOK_SIGNING_KEY`** from Calendly.
- **Zoho**: In Zoho API Console, set redirect / allowed URLs for **production**. Update **`ZOHO_*`** env vars. If **`ZOHO_AUTO_SYNC=true`**, production must reach your public URL for the internal POST.

---

## 8. Validate env before deploy (optional)

See what is still missing (uses `.env.production.local`, then `.env.production.generated`, then dev env files):

```bash
npm run production:next
```

When **DATABASE_URL** and **NEXT_PUBLIC_SERVER_URL** are filled:

```bash
npm run check:production-env
```

---

## 9. Lockfile hygiene

Ensure only **this project’s** `package-lock.json` is used (remove a stray `~/package-lock.json` if npm warns about multiple lockfiles).
