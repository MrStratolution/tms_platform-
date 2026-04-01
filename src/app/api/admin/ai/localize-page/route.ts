import { and, asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsPageLocalizations } from '@/db/schema'
import { getAuthedConsoleAiUser, canUseAiTools } from '@/lib/adminAiAuth'
import { tryGetCmsDb } from '@/lib/cmsData'
import { processOneLocalizationJob } from '@/lib/processLocalizationJob'

const bodySchema = z.object({
  pageId: z.number().int().positive(),
  /** Max jobs to run in one request (avoid timeouts). */
  limit: z.number().int().min(1).max(10).optional().default(5),
})

/**
 * Process queued localizations for a given page (manual run from `/console` session).
 */
export async function POST(request: Request) {
  const user = await getAuthedConsoleAiUser(request)
  if (!canUseAiTools(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { pageId, limit } = parsed.data

  const queued = await db
    .select({ id: cmsPageLocalizations.id })
    .from(cmsPageLocalizations)
    .where(
      and(
        eq(cmsPageLocalizations.pageId, pageId),
        eq(cmsPageLocalizations.jobStatus, 'queued'),
      ),
    )
    .orderBy(asc(cmsPageLocalizations.createdAt))
    .limit(limit)

  const ids = queued.map((d) => d.id)
  for (const id of ids) {
    await processOneLocalizationJob(db, id)
  }

  return NextResponse.json({ ok: true, processedIds: ids })
}
