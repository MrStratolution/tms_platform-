import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsCaseStudies } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    slug: z.string().min(1).max(200).optional(),
    summary: z.string().max(4000).nullable().optional(),
    industryId: z.number().int().positive().nullable().optional(),
    featuredImageId: z.number().int().positive().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsCaseStudies.$inferSelect) {
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const rows = await db.select().from(cmsCaseStudies).where(eq(cmsCaseStudies.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, caseStudy: rowJson(rows[0]) })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let json: unknown
  try { json = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const existing = await db.select().from(cmsCaseStudies).where(eq(cmsCaseStudies.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsCaseStudies.$inferInsert> = { updatedAt: now }
  if (parsed.data.title !== undefined) update.title = parsed.data.title
  if (parsed.data.slug !== undefined) update.slug = parsed.data.slug
  if (parsed.data.summary !== undefined) update.summary = parsed.data.summary
  if (parsed.data.industryId !== undefined) update.industryId = parsed.data.industryId
  if (parsed.data.featuredImageId !== undefined) update.featuredImageId = parsed.data.featuredImageId
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsCaseStudies).set(update).where(eq(cmsCaseStudies.id, id))

  const rows = await db.select().from(cmsCaseStudies).where(eq(cmsCaseStudies.id, id)).limit(1)
  return NextResponse.json({ ok: true, caseStudy: rowJson(rows[0]!) })
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const existing = await db.select().from(cmsCaseStudies).where(eq(cmsCaseStudies.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(cmsCaseStudies).where(eq(cmsCaseStudies.id, id))
  return NextResponse.json({ ok: true })
}
