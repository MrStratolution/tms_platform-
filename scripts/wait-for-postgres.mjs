/**
 * Poll TCP until Postgres accepts connections (or timeout).
 * Loads .env / .env.local (first existing wins, same order as Next).
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'
import net from 'net'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const name of ['.env', '.env.local']) {
  const p = join(root, name)
  if (existsSync(p)) config({ path: p, override: true })
}

function parseHostPort(connectionString) {
  if (!connectionString?.trim()) {
    return { host: '127.0.0.1', port: 5432 }
  }
  try {
    const normalized = connectionString
      .replace(/^postgresql:/i, 'http:')
      .replace(/^postgres:/i, 'http:')
    const u = new URL(normalized)
    return {
      host: u.hostname || '127.0.0.1',
      port: u.port ? Number(u.port) : 5432,
    }
  } catch {
    return { host: '127.0.0.1', port: 5432 }
  }
}

const { host, port } = parseHostPort(process.env.DATABASE_URL)
const timeoutMs = Number(process.env.WAIT_FOR_PG_TIMEOUT_MS || 60000)
const intervalMs = 500

function tryOnce() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(3000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

const start = Date.now()
for (;;) {
  if (await tryOnce()) {
    console.log(`Postgres reachable at ${host}:${port}`)
    process.exit(0)
  }
  if (Date.now() - start > timeoutMs) {
    console.error(
      `Timed out after ${timeoutMs}ms waiting for Postgres at ${host}:${port}. Start it with: npm run db:up`,
    )
    process.exit(1)
  }
  await new Promise((r) => setTimeout(r, intervalMs))
}
