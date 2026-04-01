import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsCaseStudies } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200),
  summary: z.string().max(4000).optional(),
  industryId: z.number().int().positive().nullable().optional(),
  featuredImageId: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  try {
    const rows = await db
      .select()
      .from(cmsCaseStudies)
      .orderBy(asc(cmsCaseStudies.id))

    return NextResponse.json({
      ok: true,
      caseStudies: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try { json = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsCaseStudies)
      .values({
        title: parsed.data.title,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        industryId: parsed.data.industryId ?? null,
        featuredImageId: parsed.data.featuredImageId ?? null,
        active: parsed.data.active ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      ok: true,
      caseStudy: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}
