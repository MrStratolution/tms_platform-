import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsBookingProfiles } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    document: z.record(z.unknown()).optional(),
    active: z.boolean().optional(),
    internalSlug: z.string().max(200).nullable().optional(),
  })
  .refine(
    (d) =>
      d.document !== undefined || d.active !== undefined || d.internalSlug !== undefined,
    { message: 'At least one field is required' },
  )

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

  const rows = await db
    .select()
    .from(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    bookingProfile: {
      id: row.id,
      internalSlug: row.internalSlug,
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

  const existing = await db
    .select()
    .from(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.id, id))
    .limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsBookingProfiles.$inferInsert> = { updatedAt: now }
  if (parsed.data.document !== undefined) update.document = parsed.data.document
  if (parsed.data.active !== undefined) update.active = parsed.data.active
  if (parsed.data.internalSlug !== undefined) {
    update.internalSlug = parsed.data.internalSlug === '' ? null : parsed.data.internalSlug
  }

  try {
    await db.update(cmsBookingProfiles).set(update).where(eq(cmsBookingProfiles.id, id))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.id, id))
    .limit(1)
  const row = rows[0]!
  return NextResponse.json({
    ok: true,
    bookingProfile: {
      id: row.id,
      internalSlug: row.internalSlug,
      active: row.active,
      document: row.document,
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
