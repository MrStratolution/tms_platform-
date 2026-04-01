import { NextResponse } from 'next/server'

import { tryGetCmsDb } from '@/lib/cmsData'
import { runZohoSyncForLead } from '@/lib/zohoSyncJob'

const INTERNAL_HEADER = 'x-tma-internal-secret'

function parsePositiveIntParam(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  if (!/^\d+$/.test(raw)) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(n) || n < 1) return null
  return n
}

export async function POST(
  request: Request,
  context: { params: Promise<{ leadId: string }> },
) {
  const configuredSecret = process.env.INTERNAL_API_SECRET
  if (configuredSecret == null || configuredSecret === '') {
    return NextResponse.json(
      { error: 'Internal API secret is not configured' },
      { status: 503 },
    )
  }

  const provided = request.headers.get(INTERNAL_HEADER)
  if (provided !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leadId: leadIdRaw } = await context.params
  const leadId = parsePositiveIntParam(leadIdRaw)
  if (leadId == null) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const result = await runZohoSyncForLead(cms.db, leadId)
    return NextResponse.json({
      leadId,
      logId: result.logId,
      success: result.success,
      skipped: result.skipped,
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
