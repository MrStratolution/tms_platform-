import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsFormConfigs } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    document: z.record(z.unknown()).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => d.document !== undefined || d.active !== undefined, {
    message: 'At least one of document, active is required',
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

  const rows = await db.select().from(cmsFormConfigs).where(eq(cmsFormConfigs.id, id)).limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    formConfig: {
      id: row.id,
      formType: row.formType,
      active: row.active,
      document: row.document,
      updatedAt: row.updatedAt.toISOString(),
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

  const existing = await db.select().from(cmsFormConfigs).where(eq(cmsFormConfigs.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsFormConfigs.$inferInsert> = { updatedAt: now }
  if (parsed.data.document !== undefined) update.document = parsed.data.document
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsFormConfigs).set(update).where(eq(cmsFormConfigs.id, id))

  const rows = await db.select().from(cmsFormConfigs).where(eq(cmsFormConfigs.id, id)).limit(1)
  const row = rows[0]!
  return NextResponse.json({
    ok: true,
    formConfig: {
      id: row.id,
      formType: row.formType,
      active: row.active,
      document: row.document,
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
