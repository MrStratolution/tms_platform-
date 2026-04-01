import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsIndustries } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'

type RouteContext = { params: Promise<{ id: string }> }

const schema = z.object({
  name: z.string().min(1).max(300).optional(),
  slug: z.string().min(1).max(200).optional(),
  summary: z.string().max(4000).nullable().optional(),
  messaging: z.unknown().optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsIndustries.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
}

export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response
  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const rows = await db.select().from(cmsIndustries).where(eq(cmsIndustries.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, industry: rowJson(rows[0]) })
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
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const existing = await db.select().from(cmsIndustries).where(eq(cmsIndustries.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: Partial<typeof cmsIndustries.$inferInsert> = { updatedAt: new Date() }
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim()
  if (parsed.data.slug !== undefined) {
    const slugCheck = validatePageSlug(parsed.data.slug)
    if (!slugCheck.ok) return NextResponse.json({ error: slugCheck.error }, { status: 400 })
    update.slug = slugCheck.slug
  }
  if (parsed.data.summary !== undefined) update.summary = parsed.data.summary
  if (Object.prototype.hasOwnProperty.call(parsed.data, 'messaging')) update.messaging = parsed.data.messaging ?? null
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsIndustries).set(update).where(eq(cmsIndustries.id, id))
  const rows = await db.select().from(cmsIndustries).where(eq(cmsIndustries.id, id)).limit(1)
  return NextResponse.json({ ok: true, industry: rowJson(rows[0]!) })
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response
  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  await db.delete(cmsIndustries).where(eq(cmsIndustries.id, id))
  return NextResponse.json({ ok: true })
}
