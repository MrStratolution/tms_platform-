import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isAiKeyMissingError } from '@/lib/aiChatClient'
import { contentBriefSchema, generateMarketingCopy } from '@/lib/aiCopyGeneration'

const INTERNAL_HEADER = 'x-tma-internal-secret'

const bodySchema = z.object({
  brief: contentBriefSchema,
})

/**
 * POST /api/integrations/ai/generate-copy
 * Secured with INTERNAL_API_SECRET (same header as other internal jobs).
 * Requires TMA_AI_API_KEY (or OPENAI_API_KEY) and optional TMA_AI_BASE_URL. Use the JSON in your CMS workflow or console tools.
 */
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

  try {
    const copy = await generateMarketingCopy(parsed.data.brief)
    return NextResponse.json({ ok: true, copy })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed'
    const status = isAiKeyMissingError(message) ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
