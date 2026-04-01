import { desc } from 'drizzle-orm'

import { getCustomDb, migrationCheckpoint } from '@/db'

/**
 * Verifies the app-owned DB layer (Drizzle + `tma_custom` schema).
 */
export async function GET() {
  const db = getCustomDb()
  if (!db) {
    return Response.json({
      ok: true,
      customPlatform: 'skipped',
      reason: 'DATABASE_URL is not set',
    })
  }

  try {
    await db.select().from(migrationCheckpoint).orderBy(desc(migrationCheckpoint.id)).limit(1)
    return Response.json({ ok: true, customPlatform: 'ready' })
  } catch {
    return Response.json(
      {
        ok: false,
        customPlatform: 'migrate_required',
        hint: 'Apply custom migrations: npm run db:custom:migrate',
      },
      { status: 503 },
    )
  }
}
