import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsBookingProfiles } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'

const createSchema = z.object({
  internalSlug: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
  document: z.record(z.unknown()).optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const rows = await db
    .select({
      id: cmsBookingProfiles.id,
      internalSlug: cmsBookingProfiles.internalSlug,
      active: cmsBookingProfiles.active,
      updatedAt: cmsBookingProfiles.updatedAt,
    })
    .from(cmsBookingProfiles)
    .orderBy(asc(cmsBookingProfiles.id))

  return NextResponse.json({
    ok: true,
    bookingProfiles: rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
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

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const rawSlug = parsed.data.internalSlug?.trim() || null
  if (rawSlug) {
    const slugCheck = validatePageSlug(rawSlug)
    if (!slugCheck.ok) {
      return NextResponse.json({ error: slugCheck.error }, { status: 400 })
    }
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()

  try {
    const [row] = await db
      .insert(cmsBookingProfiles)
      .values({
        internalSlug: rawSlug,
        active: parsed.data.active ?? true,
        document: parsed.data.document ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      ok: true,
      bookingProfile: {
        id: row!.id,
        internalSlug: row!.internalSlug,
        active: row!.active,
        document: row!.document,
        updatedAt: row!.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
