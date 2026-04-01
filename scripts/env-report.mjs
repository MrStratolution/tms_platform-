/**
 * Print which env vars are set (values redacted) — safe to paste into chat / tickets.
 * Usage: npm run env:report
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const name of ['.env', '.env.local']) {
  const p = join(root, name)
  if (existsSync(p)) config({ path: p, override: true })
}

const KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'ADMIN_SESSION_SECRET',
  'PAGE_READ_SOURCE',
  'NEXT_PUBLIC_SERVER_URL',
  'TZ',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'INTERNAL_NOTIFY_EMAILS',
  'INTERNAL_API_SECRET',
  'INTERNAL_PREVIEW_SECRET',
  'TMA_AI_API_KEY',
  'TMA_AI_BASE_URL',
  'TMA_AI_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'NEXT_PUBLIC_AB_ASSIGN_API',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'TURNSTILE_SECRET_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'HCAPTCHA_SECRET_KEY',
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_AUTO_SYNC',
  'ZOHO_USE_MOCK',
  'CALENDLY_WEBHOOK_SIGNING_KEY',
  'ALLOW_HTTP_PUBLIC_URL',
  'FORM_RATE_LIMIT_MAX',
  'FORM_RATE_LIMIT_WINDOW_MS',
  'CONSOLE_LOGIN_RATE_LIMIT_MAX',
  'CONSOLE_LOGIN_RATE_LIMIT_WINDOW_MS',
]

function maskUrl(url) {
  if (!url) return '(empty)'
  try {
    const normalized = url.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:')
    const u = new URL(normalized)
    const user = u.username ? `${u.username}:***` : '***'
    const host = u.hostname || '?'
    const port = u.port ? `:${u.port}` : ''
    const path = u.pathname || ''
    return `postgresql://${user}@${host}${port}${path}${u.search || ''}`
  } catch {
    return '(invalid URL, hidden)'
  }
}

function line(key) {
  const v = process.env[key]
  if (v === undefined || v === '') {
    return `${key}=(not set)`
  }
  if (key === 'DATABASE_URL') return `${key}=${maskUrl(v)}`
  if (
    key.includes('SECRET') ||
    key.includes('TOKEN') ||
    key.includes('KEY') ||
    key === 'ZOHO_REFRESH_TOKEN'
  ) {
    return `${key}=*** (${v.length} chars)`
  }
  if (key === 'RESEND_FROM_EMAIL' || key === 'INTERNAL_NOTIFY_EMAILS' || key === 'NEXT_PUBLIC_SERVER_URL') {
    return `${key}=${v}`
  }
  if (key === 'ZOHO_CLIENT_ID') return `${key}=${v.slice(0, 6)}…`
  return `${key}=(set, ${v.length} chars)`
}

console.log('# Redacted env report — safe to share\n')
for (const k of KEYS) {
  console.log(line(k))
}

const required = ['ADMIN_SESSION_SECRET', 'DATABASE_URL', 'NEXT_PUBLIC_SERVER_URL']
const missing = required.filter((k) => !process.env[k]?.trim())
if (missing.length) {
  console.log('\n# Missing required:', missing.join(', '))
  process.exitCode = 1
} else {
  console.log('\n# Required keys: OK')
}

const adminSess = process.env.ADMIN_SESSION_SECRET?.trim() ?? ''
if (adminSess.length > 0 && adminSess.length < 32) {
  console.log('\n# Warning: ADMIN_SESSION_SECRET is set but <32 chars — /console login will fail.')
  process.exitCode = 1
} else if (!adminSess) {
  console.log('\n# Note: ADMIN_SESSION_SECRET not set — run npm run ensure-console-secret for /console.')
}
