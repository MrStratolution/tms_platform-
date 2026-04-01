/**
 * Test DATABASE_URL from .env — prints clear success or Postgres error text.
 * Usage: npm run db:ping
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import pg from 'pg'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  config({ path: envPath })
}

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or set DATABASE_URL.')
  process.exit(1)
}

const maxAttempts = Math.max(1, Number(process.env.DB_PING_ATTEMPTS || '60'))
const intervalMs = Math.max(100, Number(process.env.DB_PING_INTERVAL_MS || '500'))

function isTransientPostgresError(e) {
  const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
  if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'].includes(code)) {
    return true
  }
  const msg = e instanceof Error ? e.message : String(e)
  return /starting up|connection.*closed|server closed the connection/i.test(msg)
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const client = new pg.Client({ connectionString: url })
  try {
    await client.connect()
    const { rows } = await client.query(
      'select current_user as user, current_database() as database',
    )
    console.log('PostgreSQL OK:', rows[0])
    await client.end().catch(() => {})
    process.exit(0)
  } catch (e) {
    await client.end().catch(() => {})
    const msg = e instanceof Error ? e.message : String(e)
    if (attempt < maxAttempts && isTransientPostgresError(e)) {
      if (attempt === 1) {
        console.error(
          `PostgreSQL not ready yet (${msg}). Retrying up to ${maxAttempts} times (${intervalMs}ms apart). ` +
            'Tip: run "npm run wait-for-pg" right after "npm run db:up".',
        )
      }
      await new Promise((r) => setTimeout(r, intervalMs))
      continue
    }
    console.error('PostgreSQL connection failed:', msg)
    if (/password authentication failed|28P01/i.test(msg)) {
      console.error(`
Hint: The user/password in DATABASE_URL do not match the server on this host:port.

• Docker from this repo: user tma, password tma, database tma_platform_4069, host port 5443
  (see docker-compose.yml). DATABASE_URL must use 127.0.0.1:5443 unless you changed the mapping.
  Run: docker compose ps  →  tma-platform-4069-postgres-1 should be "running" (after running npm run db:up).
  If "Bind for 5432 failed" or "Bind for 5433 failed" appeared before: use 5443 mapping + db:ping after db:up.
  Reset volume if needed (deletes data): npm run db:down && docker volume rm tma-platform-4069_tma_pg_data 2>/dev/null; npm run db:up
  Then: npm run wait-for-pg && npm run db:custom:migrate

• If DATABASE_URL still points at :5432, you may be connecting to a different Postgres
  (wrong password for user tma). Align the port with this project's docker-compose.yml.
`)
    }
    process.exit(1)
  }
}
