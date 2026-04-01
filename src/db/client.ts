import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema'

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

const globalForDrizzle = globalThis as unknown as {
  __tmaCustomPool?: pg.Pool
  __tmaCustomDb?: DrizzleDb
}

function getPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!globalForDrizzle.__tmaCustomPool) {
    globalForDrizzle.__tmaCustomPool = new pg.Pool({
      connectionString: url,
      max: 5,
    })
  }
  return globalForDrizzle.__tmaCustomPool
}

/**
 * App-owned Postgres access (`tma_custom`). Returns null if DATABASE_URL is unset.
 */
export function getCustomDb(): DrizzleDb | null {
  const pool = getPool()
  if (!pool) return null
  if (!globalForDrizzle.__tmaCustomDb) {
    globalForDrizzle.__tmaCustomDb = drizzle(pool, { schema })
  }
  return globalForDrizzle.__tmaCustomDb
}
