/**
 * Guided production setup: shows what is missing, then optional migrate.
 *
 *   npm run production:next              # print status + next actions
 *   npm run production:next -- --migrate # run Drizzle migrate (needs DATABASE_URL)
 *   npm run production:next -- --check   # same as npm run check:production-env
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const shellDb =
  process.env.DATABASE_URL?.trim() &&
  /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL.trim())

let loadedProdEnv = false
for (const name of ['.env.production.generated', '.env.production.local']) {
  const p = join(root, name)
  if (existsSync(p)) {
    config({ path: p, override: true })
    loadedProdEnv = true
  }
}

if (!loadedProdEnv && !(argv.includes('--migrate') && shellDb)) {
  console.log('\n# No production env file found')
  console.log('  Run: npm run gen:production-env')
  console.log('  Then edit .env.production.generated, or copy vars into .env.production.local')
  console.log('  (This command ignores dev .env so the checklist stays production-only.)')
  console.log('  For a one-off migrate you can instead: export DATABASE_URL=… && npm run db:custom:migrate\n')
  process.exit(1)
}

const db = process.env.DATABASE_URL?.trim() ?? ''
const pub = process.env.NEXT_PUBLIC_SERVER_URL?.trim() ?? ''
const admin = process.env.ADMIN_SESSION_SECRET?.trim() ?? ''

const placeholderHost = /your-domain\.com/i.test(pub)
const dbOk = db.length > 0 && /^postgres(ql)?:\/\//i.test(db)
const adminOk = admin.length >= 32

console.log('\n# Production setup status\n')

const rows = [
  ['DATABASE_URL', dbOk ? 'set' : db ? 'invalid (need postgresql://…)' : 'missing — paste from Neon / Supabase / Railway'],
  [
    'NEXT_PUBLIC_SERVER_URL',
    pub
      ? placeholderHost
        ? 'still placeholder (replace your-domain.com)'
        : pub.endsWith('/')
          ? 'remove trailing /'
          : 'set'
      : 'missing',
  ],
  ['ADMIN_SESSION_SECRET', adminOk ? 'ok (≥32 chars)' : admin ? 'too short' : 'missing'],
]

for (const [k, v] of rows) {
  console.log(`  ${k}: ${v}`)
}

const blockers = []
if (!dbOk) blockers.push('DATABASE_URL')
if (!pub || placeholderHost || pub.endsWith('/')) blockers.push('NEXT_PUBLIC_SERVER_URL')
if (!adminOk) blockers.push('ADMIN_SESSION_SECRET')

console.log('\n# Suggested order')
console.log('  1. Create managed Postgres; copy connection string → DATABASE_URL')
console.log('  2. Set NEXT_PUBLIC_SERVER_URL to the live origin (https, no trailing slash)')
console.log('  3. npm run check:production-env')
console.log('  4. npm run production:next -- --migrate')
console.log('  5. Deploy; copy all vars to the host; create admin: npm run create-console-admin -- you@domain.com \'…\'')
console.log('  6. Smoke: /, /console/login, published page, optional form submit\n')

if (argv.includes('--check')) {
  const r = spawnSync('node', [join(root, 'scripts/check-prod-env.mjs')], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })
  process.exit(r.status ?? 1)
}

if (argv.includes('--migrate')) {
  if (!dbOk) {
    console.error('Cannot migrate: set a valid DATABASE_URL (postgresql://…)')
    process.exit(1)
  }
  console.log('Running npm run db:custom:migrate …\n')
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'db:custom:migrate'], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, DATABASE_URL: db },
  })
  process.exit(r.status ?? 1)
}

process.exit(blockers.length ? 1 : 0)
