import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsEmailTemplates } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { createSystemEmailTemplate, listSystemEmailTemplates } from '@/lib/email/systemStore'
import { emailTemplateCreateSchema } from '@/lib/email/systemSchemas'

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const templates = await listSystemEmailTemplates(db)
  return NextResponse.json({ ok: true, emailTemplates: templates })
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = emailTemplateCreateSchema.safeParse(json)
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

  const key = parsed.data.key.trim().toLowerCase()
  const existing = await db
    .select({ id: cmsEmailTemplates.id })
    .from(cmsEmailTemplates)
    .where(
      and(
        eq(cmsEmailTemplates.key, key),
        eq(cmsEmailTemplates.language, parsed.data.language),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: `A template for "${key}" in ${parsed.data.language.toUpperCase()} already exists.`,
      },
      { status: 409 },
    )
  }

  try {
    const row = await createSystemEmailTemplate(db, {
      key,
      language: parsed.data.language,
      subject: parsed.data.subject,
      htmlBody: parsed.data.htmlBody,
      variablesJson: parsed.data.variablesJson,
      active: parsed.data.active,
    })
    return NextResponse.json({ ok: true, emailTemplate: row })
  } catch (error) {
    const message =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
        ? `A template for "${key}" in ${parsed.data.language.toUpperCase()} already exists.`
        : error instanceof Error
          ? error.message
          : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
