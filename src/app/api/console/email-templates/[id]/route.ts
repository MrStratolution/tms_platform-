import { NextResponse } from 'next/server'

import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import {
  getSystemEmailTemplateById,
  updateSystemEmailTemplate,
} from '@/lib/email/systemStore'
import { emailTemplatePatchSchema } from '@/lib/email/systemSchemas'
import { getCustomDb } from '@/db/client'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const row = await getSystemEmailTemplateById(db, id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    emailTemplate: {
      ...row,
      name: `${row.key} (${row.language.toUpperCase()})`,
      slug: row.key,
      body: row.htmlBody,
    },
  })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const normalized =
    json && typeof json === 'object'
      ? {
          subject:
            typeof (json as { subject?: unknown }).subject === 'string'
              ? (json as { subject: string }).subject
              : '',
          htmlBody:
            typeof (json as { htmlBody?: unknown }).htmlBody === 'string'
              ? (json as { htmlBody: string }).htmlBody
              : typeof (json as { body?: unknown }).body === 'string'
                ? (json as { body: string }).body
                : '',
          active:
            typeof (json as { active?: unknown }).active === 'boolean'
              ? (json as { active: boolean }).active
              : true,
        }
      : null

  const parsed = emailTemplatePatchSchema.safeParse(normalized)
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

  const row = await updateSystemEmailTemplate(db, id, parsed.data)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    emailTemplate: {
      ...row,
      name: `${row.key} (${row.language.toUpperCase()})`,
      slug: row.key,
      body: row.htmlBody,
    },
  })
}
