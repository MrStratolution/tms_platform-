import { asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { cmsPageLocalizations } from '@/db/schema'
import { tryGetCmsDb } from '@/lib/cmsData'
import { processOneLocalizationJob } from '@/lib/processLocalizationJob'

const INTERNAL_HEADER = 'x-tma-internal-secret'
const DEFAULT_BATCH = 8

/**
 * Cron / worker: process queued localization jobs across all pages.
 */
export async function POST(request: Request) {
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim()
  if (!configuredSecret) {
    return NextResponse.json({ error: 'INTERNAL_API_SECRET is not configured' }, { status: 503 })
  }
  if (request.headers.get(INTERNAL_HEADER) !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const queued = await db
    .select({ id: cmsPageLocalizations.id })
    .from(cmsPageLocalizations)
    .where(eq(cmsPageLocalizations.jobStatus, 'queued'))
    .orderBy(asc(cmsPageLocalizations.createdAt))
    .limit(DEFAULT_BATCH)

  const ids = queued.map((d) => d.id)
  for (const id of ids) {
    await processOneLocalizationJob(db, id)
  }

  return NextResponse.json({ ok: true, processedIds: ids })
}
