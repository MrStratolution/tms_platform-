import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsLeads } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchLeadSchema = z.object({
  leadStatus: z.enum(['new', 'contacted', 'qualified', 'lost', 'won']).optional(),
  owner: z.union([z.string().max(500), z.null()]).optional(),
  notes: z.union([z.string().max(20000), z.null()]).optional(),
})

function leadToJson(row: typeof cmsLeads.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * GET /api/console/leads/[id]
 */
export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'leads:read')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const rows = await db.select().from(cmsLeads).where(eq(cmsLeads.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, lead: leadToJson(row) })
}

/**
 * PATCH /api/console/leads/[id] — update ops fields (owner, status, notes).
 */
export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'leads:write')
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

  const parsed = patchLeadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const existing = await db.select().from(cmsLeads).where(eq(cmsLeads.id, id)).limit(1)
  if (!existing[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const now = new Date()
  const update: Partial<typeof cmsLeads.$inferInsert> = { updatedAt: now }
  if (parsed.data.leadStatus !== undefined) update.leadStatus = parsed.data.leadStatus
  if (parsed.data.owner !== undefined) update.owner = parsed.data.owner
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes

  try {
    await db.update(cmsLeads).set(update).where(eq(cmsLeads.id, id))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const rows = await db.select().from(cmsLeads).where(eq(cmsLeads.id, id)).limit(1)
  return NextResponse.json({ ok: true, lead: leadToJson(rows[0]!) })
}
