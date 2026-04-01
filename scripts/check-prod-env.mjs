/**
 * Validates required production env vars.
 * Usage:
 *   npm run check:production-env
 *   # or load a file first:
 *   set -a && source .env.production.local && set +a && node scripts/check-prod-env.mjs
 *
 * Loads the first existing file, in order: .env.production.local, .env.production.generated,
 * .env.local, .env (so a filled generated template is used before dev .env when present).
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const name of [
  '.env.production.local',
  '.env.production.generated',
  '.env.local',
  '.env',
]) {
  const p = join(root, name)
  if (existsSync(p)) {
    config({ path: p, override: true })
    break
  }
}

const errors = []
const req = ['ADMIN_SESSION_SECRET', 'DATABASE_URL', 'NEXT_PUBLIC_SERVER_URL']
for (const k of req) {
  if (!process.env[k]?.trim()) errors.push(`Missing ${k}`)
}

const pub = process.env.NEXT_PUBLIC_SERVER_URL?.trim() ?? ''
if (pub.endsWith('/')) errors.push('NEXT_PUBLIC_SERVER_URL must not end with /')

function isLocalDevPublicUrl(url) {
  try {
    const u = new URL(url)
    const h = u.hostname.toLowerCase()
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '[::1]' ||
      h.endsWith('.local')
    )
  } catch {
    return false
  }
}

if (
  pub &&
  !pub.startsWith('https://') &&
  process.env.ALLOW_HTTP_PUBLIC_URL !== '1' &&
  !isLocalDevPublicUrl(pub)
) {
  errors.push(
    'NEXT_PUBLIC_SERVER_URL should use https:// in production (or set ALLOW_HTTP_PUBLIC_URL=1 for staging HTTP)',
  )
}

const adminSess = process.env.ADMIN_SESSION_SECRET ?? ''
if (adminSess.length > 0 && adminSess.length < 32) {
  errors.push('ADMIN_SESSION_SECRET should be at least 32 characters')
}

const db = process.env.DATABASE_URL ?? ''
if (db && !/^postgres(ql)?:\/\//i.test(db)) {
  errors.push('DATABASE_URL should start with postgresql:// or postgres://')
}

if (errors.length) {
  console.error('Production env check failed:\n- ' + errors.join('\n- '))
  process.exit(1)
}

console.log('Env check passed (required keys present).')
