import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsEmailTemplates } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(500),
    subject: z.string().min(1, 'Subject is required').max(998),
    body: z.string(),
  })
  .partial()
  .refine((d) => d.name !== undefined || d.subject !== undefined || d.body !== undefined, {
    message: 'At least one of name, subject, body is required',
  })

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

  const rows = await db.select().from(cmsEmailTemplates).where(eq(cmsEmailTemplates.id, id)).limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    emailTemplate: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      subject: row.subject,
      body: row.body,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
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

  const parsed = patchSchema.safeParse(json)
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

  const existing = await db.select().from(cmsEmailTemplates).where(eq(cmsEmailTemplates.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsEmailTemplates.$inferInsert> = { updatedAt: now }
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim()
  if (parsed.data.subject !== undefined) update.subject = parsed.data.subject.trim()
  if (parsed.data.body !== undefined) update.body = parsed.data.body

  await db.update(cmsEmailTemplates).set(update).where(eq(cmsEmailTemplates.id, id))

  const rows = await db.select().from(cmsEmailTemplates).where(eq(cmsEmailTemplates.id, id)).limit(1)
  const row = rows[0]!
  return NextResponse.json({
    ok: true,
    emailTemplate: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      subject: row.subject,
      body: row.body,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    },
  })
}
