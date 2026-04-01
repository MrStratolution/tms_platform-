import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'

const createProductSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  status: z.enum(['draft', 'published']).default('draft'),
  document: z.record(z.unknown()).optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let rows
  try {
    rows = await db
      .select({
        id: cmsProducts.id,
        slug: cmsProducts.slug,
        name: cmsProducts.name,
        status: cmsProducts.status,
        updatedAt: cmsProducts.updatedAt,
      })
      .from(cmsProducts)
      .orderBy(desc(cmsProducts.updatedAt))
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }

  return NextResponse.json({
    ok: true,
    products: rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}

/**
 * POST /api/console/products — create offer row.
 */
export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createProductSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const slugCheck = validatePageSlug(parsed.data.slug)
  if (!slugCheck.ok) {
    return NextResponse.json({ error: slugCheck.error }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const taken = await db
    .select({ id: cmsProducts.id })
    .from(cmsProducts)
    .where(eq(cmsProducts.slug, slugCheck.slug))
    .limit(1)
  if (taken[0]) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const document = parsed.data.document ?? {
    tagline: 'Short value proposition',
    modules: [],
    primaryCta: { label: 'Book a call', href: '/contact' },
  }

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsProducts)
      .values({
        slug: slugCheck.slug,
        name: parsed.data.name.trim(),
        status: parsed.data.status,
        document,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!row) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

    return NextResponse.json({
      ok: true,
      product: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        document: row.document,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    const message = e instanceof Error ? e.message : 'Insert failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
