import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsTeamMembers } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    name: z.string().min(1).max(300).optional(),
    role: z.string().min(1).max(300).optional(),
    bio: z.string().max(4000).nullable().optional(),
    photoMediaId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().optional(),
    linkedinUrl: z.string().max(500).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsTeamMembers.$inferSelect) {
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

  const rows = await db.select().from(cmsTeamMembers).where(eq(cmsTeamMembers.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, teamMember: rowJson(rows[0]) })
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

  const existing = await db.select().from(cmsTeamMembers).where(eq(cmsTeamMembers.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsTeamMembers.$inferInsert> = { updatedAt: now }
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (parsed.data.role !== undefined) update.role = parsed.data.role
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio
  if (parsed.data.photoMediaId !== undefined) update.photoMediaId = parsed.data.photoMediaId
  if (parsed.data.sortOrder !== undefined) update.sortOrder = parsed.data.sortOrder
  if (parsed.data.linkedinUrl !== undefined) update.linkedinUrl = parsed.data.linkedinUrl
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsTeamMembers).set(update).where(eq(cmsTeamMembers.id, id))

  const rows = await db.select().from(cmsTeamMembers).where(eq(cmsTeamMembers.id, id)).limit(1)
  return NextResponse.json({ ok: true, teamMember: rowJson(rows[0]!) })
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const existing = await db.select().from(cmsTeamMembers).where(eq(cmsTeamMembers.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(cmsTeamMembers).where(eq(cmsTeamMembers.id, id))
  return NextResponse.json({ ok: true })
}
