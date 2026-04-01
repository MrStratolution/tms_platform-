import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { cmsLeads } from '@/db/schema'
import { tryGetCmsDb } from '@/lib/cmsData'
import { runZohoSyncForLead } from '@/lib/zohoSyncJob'

const INTERNAL_HEADER = 'x-tma-internal-secret'
const MAX_BATCH = 25

export async function POST(request: Request) {
  const configuredSecret = process.env.INTERNAL_API_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: 'Internal API secret is not configured' }, { status: 503 })
  }
  if (request.headers.get(INTERNAL_HEADER) !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const failed = await db
    .select({ id: cmsLeads.id })
    .from(cmsLeads)
    .where(eq(cmsLeads.crmSyncStatus, 'failed'))
    .orderBy(desc(cmsLeads.createdAt))
    .limit(MAX_BATCH)

  const results: { leadId: number; logId: number; success: boolean; skipped: boolean }[] = []
  for (const row of failed) {
    try {
      const r = await runZohoSyncForLead(db, row.id)
      results.push({
        leadId: row.id,
        logId: r.logId,
        success: r.success,
        skipped: r.skipped,
      })
    } catch {
      /* skip */
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
