import { NextResponse } from 'next/server'

import { getCustomDb } from '@/db/client'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { encryptSmtpPassword } from '@/lib/email/passwordCrypto'
import { getLatestSmtpSettings, toPublicSmtpSettings, upsertSmtpSettings } from '@/lib/email/systemStore'
import { smtpSettingsInputSchema } from '@/lib/email/systemSchemas'

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'integrations:manage')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const row = await getLatestSmtpSettings(db)
  return NextResponse.json({
    ok: true,
    smtpSettings: toPublicSmtpSettings(row),
  })
}

export async function PATCH(request: Request) {
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

  const parsed = smtpSettingsInputSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const existing = await getLatestSmtpSettings(db)
  const nextPassword =
    parsed.data.password && parsed.data.password.trim()
      ? parsed.data.password.trim()
      : existing?.passwordEncrypted
        ? null
        : ''

  if (nextPassword === '') {
    return NextResponse.json({ error: 'SMTP password is required' }, { status: 400 })
  }

  const row = await upsertSmtpSettings(db, {
    ...parsed.data,
    passwordEncrypted:
      nextPassword === null
        ? existing!.passwordEncrypted
        : encryptSmtpPassword(nextPassword),
  })

  return NextResponse.json({
    ok: true,
    smtpSettings: toPublicSmtpSettings(row),
  })
}
