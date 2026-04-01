/**
 * Ensures `.env` has a strong ADMIN_SESSION_SECRET for /console JWT auth.
 * Run after `ensure-env` (needs an existing .env).
 *
 * Usage: npm run ensure-console-secret
 */
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

if (!existsSync(envPath)) {
  console.error('No .env — run npm run ensure-env first.')
  process.exit(1)
}

let content = readFileSync(envPath, 'utf8')
const newSecret = randomBytes(32).toString('hex')
const lineRe = /^ADMIN_SESSION_SECRET=(.*)$/m

function valueTooShort(raw) {
  const v = (raw ?? '').replace(/\r$/, '').trim()
  return v.length < 32
}

const m = content.match(lineRe)
if (!m) {
  const suffix = content.endsWith('\n') ? '' : '\n'
  writeFileSync(envPath, `${content}${suffix}ADMIN_SESSION_SECRET=${newSecret}\n`, 'utf8')
  console.log('Added ADMIN_SESSION_SECRET to .env (for /console).')
} else if (valueTooShort(m[1])) {
  writeFileSync(envPath, content.replace(lineRe, `ADMIN_SESSION_SECRET=${newSecret}`), 'utf8')
  console.log('Updated ADMIN_SESSION_SECRET (was empty or <32 chars).')
} else {
  console.log('ADMIN_SESSION_SECRET already OK (≥32 chars).')
}
