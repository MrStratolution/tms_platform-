import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { isAiKeyMissingError } from '@/lib/aiChatClient'
import { fetchLeadCopilotContext } from '@/lib/leadCopilotData'
import { buildWhatsAppHref, generateLeadCopilotResult } from '@/lib/leadAi'

const INTERNAL_HEADER = 'x-tma-internal-secret'

const bodySchema = z.object({
  leadId: z.number().int().positive(),
})

export async function POST(request: Request) {
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim()
  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'INTERNAL_API_SECRET is not configured' },
      { status: 503 },
    )
  }
  if (request.headers.get(INTERNAL_HEADER) !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const loaded = await fetchLeadCopilotContext(db, parsed.data.leadId)
  if (!loaded) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    const result = await generateLeadCopilotResult(loaded.context)
    return NextResponse.json({
      ok: true,
      result,
      meta: {
        ...loaded.meta,
        whatsAppHref: buildWhatsAppHref(loaded.meta.phone, result.whatsAppDraft),
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed'
    const status = isAiKeyMissingError(message) ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
