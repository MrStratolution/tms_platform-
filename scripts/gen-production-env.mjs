/**
 * Writes `.env.production.generated` (gitignored) with random INTERNAL_* preview secrets and
 * ADMIN_SESSION_SECRET. Fill DATABASE_URL and NEXT_PUBLIC_SERVER_URL, then copy into your host’s
 * environment UI.
 */
import { randomBytes } from 'crypto'
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.env.production.generated')

const adminSessionSecret = randomBytes(32).toString('hex')
const internalApiSecret = randomBytes(32).toString('base64url')
const previewSecret = randomBytes(32).toString('base64url')

const content = `# AUTO-GENERATED — DO NOT COMMIT (see .gitignore).
# Copy values into Vercel / Railway / Fly / Docker secrets, then delete this file if you prefer.

# Custom admin /console (JWT cookie) — ≥32 chars
ADMIN_SESSION_SECRET=${adminSessionSecret}

# Paste connection string from Neon, Supabase, Railway Postgres, AWS RDS, etc.
# Example Neon: postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=

# Public site URL — no trailing slash. Must match the browser origin.
NEXT_PUBLIC_SERVER_URL=https://your-domain.com

# Zoho auto-sync + replay-failed + internal jobs
INTERNAL_API_SECRET=${internalApiSecret}

# GET /api/pages/[slug]/preview
INTERNAL_PREVIEW_SECRET=${previewSecret}

# Lead notify (comma-separated); uses Resend when RESEND_API_KEY is set
# INTERNAL_NOTIFY_EMAILS=ops@your-domain.com

# Optional Resend
# RESEND_API_KEY=
# RESEND_FROM_EMAIL=TMA <notifications@your-domain.com>

# Multi-instance / serverless rate limits (recommended for Vercel)
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# Console sign-in rate limit (per IP; in-memory if Upstash unset)
# CONSOLE_LOGIN_RATE_LIMIT_MAX=20
# CONSOLE_LOGIN_RATE_LIMIT_WINDOW_MS=900000

# Staging HTTP: set to 1 only if you must use http:// for NEXT_PUBLIC_SERVER_URL
# ALLOW_HTTP_PUBLIC_URL=

# Cloudflare Turnstile (optional bot protection on forms)
# TURNSTILE_SECRET_KEY=
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# AI in console (copy / localization jobs) — prefer TMA_AI_*
# TMA_AI_API_KEY=
# TMA_AI_BASE_URL=https://api.openai.com/v1
# TMA_AI_MODEL=gpt-4o-mini

# Optional integrations (set when you use them)
# CALENDLY_WEBHOOK_SIGNING_KEY=
# ZOHO_CLIENT_ID=
# ZOHO_CLIENT_SECRET=
# ZOHO_REFRESH_TOKEN=
# ZOHO_AUTO_SYNC=true
`

writeFileSync(out, content, 'utf8')
console.log(`Wrote ${out}`)
console.log(
  'Next: set DATABASE_URL + NEXT_PUBLIC_SERVER_URL in that file, then copy to your host.',
)
