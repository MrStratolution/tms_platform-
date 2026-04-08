import { NextResponse } from 'next/server'

import { getCustomDb } from '@/db/client'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { sendSmtpTestEmail } from '@/lib/email/service'
import { smtpTestEmailSchema } from '@/lib/email/systemSchemas'

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'integrations:manage')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = smtpTestEmailSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const result = await sendSmtpTestEmail({
    db,
    to: parsed.data.to,
    language: auth.user.uiLocale,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'SMTP test failed' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
