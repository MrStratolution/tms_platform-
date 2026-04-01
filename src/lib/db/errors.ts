import { NextResponse } from 'next/server'

/**
 * Detect Postgres "relation does not exist" (e.g. migration 0004 not applied yet).
 * Walks Error.cause chains from Drizzle/pg wrappers.
 */
export function isMissingDbRelationError(error: unknown): boolean {
  let current: unknown = error
  const seen = new Set<unknown>()
  while (current != null && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const o = current as { code?: string; message?: string; cause?: unknown }
    if (o.code === '42P01') return true
    const msg = (o.message ?? '').toLowerCase()
    if (
      msg.includes('does not exist') &&
      (msg.includes('relation') || msg.includes('table'))
    ) {
      return true
    }
    current = o.cause
  }
  return false
}

export const MIGRATE_HINT =
  'Run `npm run db:custom:migrate` from the project root (adds `cms_product`, `cms_media`, etc.), then refresh.'

/** 503 JSON for API routes when migrations are behind. */
export function missingRelationJsonResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: 'Database schema is missing required tables',
      hint: MIGRATE_HINT,
    },
    { status: 503 },
  )
}
