import { asc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsIndustries } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'

const schema = z.object({
  name: z.string().min(1).max(300),
  slug: z.string().min(1).max(200),
  summary: z.string().max(4000).nullable().optional(),
  messaging: z.unknown().optional(),
  active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const rows = await db.select().from(cmsIndustries).orderBy(asc(cmsIndustries.name))
  return NextResponse.json({
    ok: true,
    industries: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response
  let json: unknown
  try { json = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }
  const slugCheck = validatePageSlug(parsed.data.slug)
  if (!slugCheck.ok) return NextResponse.json({ error: slugCheck.error }, { status: 400 })
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const now = new Date()
  const [row] = await db.insert(cmsIndustries).values({
    name: parsed.data.name.trim(),
    slug: slugCheck.slug,
    summary: parsed.data.summary ?? null,
    messaging: parsed.data.messaging ?? null,
    active: parsed.data.active ?? true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  return NextResponse.json({
    ok: true,
    industry: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  })
}
