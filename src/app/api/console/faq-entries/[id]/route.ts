import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsFaqEntries } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    question: z.string().min(1).max(2000).optional(),
    answer: z.string().min(1).max(20000).optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsFaqEntries.$inferSelect) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

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

  const rows = await db.select().from(cmsFaqEntries).where(eq(cmsFaqEntries.id, id)).limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, faqEntry: rowJson(row) })
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

  const existing = await db.select().from(cmsFaqEntries).where(eq(cmsFaqEntries.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsFaqEntries.$inferInsert> = { updatedAt: now }
  if (parsed.data.question !== undefined) update.question = parsed.data.question
  if (parsed.data.answer !== undefined) update.answer = parsed.data.answer
  if (parsed.data.sortOrder !== undefined) update.sortOrder = parsed.data.sortOrder
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsFaqEntries).set(update).where(eq(cmsFaqEntries.id, id))

  const rows = await db.select().from(cmsFaqEntries).where(eq(cmsFaqEntries.id, id)).limit(1)
  return NextResponse.json({ ok: true, faqEntry: rowJson(rows[0]!) })
}
