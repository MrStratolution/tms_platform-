import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsTestimonials } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const createSchema = z.object({
  quote: z.string().min(1).max(8000),
  author: z.string().min(1).max(300),
  role: z.string().max(300).optional(),
  company: z.string().max(300).optional(),
  photoMediaId: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
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
      id: cmsTestimonials.id,
      quote: cmsTestimonials.quote,
      author: cmsTestimonials.author,
      active: cmsTestimonials.active,
      updatedAt: cmsTestimonials.updatedAt,
    })
    .from(cmsTestimonials)
    .orderBy(asc(cmsTestimonials.id))

  return NextResponse.json({
    ok: true,
    testimonials: rows.map((r) => ({
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

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()
  const [row] = await db
    .insert(cmsTestimonials)
    .values({
      quote: parsed.data.quote,
      author: parsed.data.author,
      role: parsed.data.role ?? null,
      company: parsed.data.company ?? null,
      photoMediaId: parsed.data.photoMediaId ?? null,
      active: parsed.data.active ?? true,
      updatedAt: now,
      createdAt: now,
    })
    .returning()

  return NextResponse.json({
    ok: true,
    testimonial: {
      id: row!.id,
      quote: row!.quote,
      author: row!.author,
      role: row!.role,
      company: row!.company,
      photoMediaId: row!.photoMediaId,
      active: row!.active,
      updatedAt: row!.updatedAt.toISOString(),
      createdAt: row!.createdAt.toISOString(),
    },
  })
}
