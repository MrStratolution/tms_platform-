import { createHash } from 'crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsTrackingEvents } from '@/db/schema'
import { tryGetCmsDb } from '@/lib/cmsData'
import { logEvent } from '@/lib/logger'
import { clientIpFromRequest } from '@/lib/rateLimit'

const bodySchema = z.object({
  eventType: z.string().min(1).max(120),
  path: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  visitorKey: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const ip = clientIpFromRequest(request)
  const visitorKey =
    parsed.data.visitorKey?.trim() ||
    createHash('sha256').update(ip).digest('hex').slice(0, 32)

  await db.insert(cmsTrackingEvents).values({
    name: parsed.data.eventType,
    properties: {
      path: parsed.data.path,
      metadata: parsed.data.metadata ?? {},
      visitorKey,
    },
    leadId: null,
  })

  logEvent({
    event: 'tracking_event',
    eventType: parsed.data.eventType,
    path: parsed.data.path,
    visitorKey,
  })

  return NextResponse.json({ ok: true })
}
