import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthedConsoleAiUser, canUseAiTools } from '@/lib/adminAiAuth'
import { isAiKeyMissingError } from '@/lib/aiChatClient'
import { contentBriefSchema, generateMarketingCopy } from '@/lib/aiCopyGeneration'

const bodySchema = z.object({
  brief: contentBriefSchema,
})

/**
 * Same as POST /api/integrations/ai/generate-copy but uses `/console` session cookie.
 */
export async function POST(request: Request) {
  const user = await getAuthedConsoleAiUser(request)
  if (!canUseAiTools(user)) {
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
