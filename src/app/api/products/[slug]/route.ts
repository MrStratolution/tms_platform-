import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'
import { normalizeProductContentKind } from '@/lib/productFeeds'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * Public: single published product by slug.
 */
export async function GET(_request: Request, ctx: RouteContext) {
  const { slug } = await ctx.params
  const trimmed = slug?.trim()
  if (!trimmed) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rows = await db
      .select({
        slug: cmsProducts.slug,
        name: cmsProducts.name,
        contentKind: cmsProducts.contentKind,
        publishedAt: cmsProducts.publishedAt,
        listingPriority: cmsProducts.listingPriority,
        showInProjectFeeds: cmsProducts.showInProjectFeeds,
        document: cmsProducts.document,
        updatedAt: cmsProducts.updatedAt,
      })
      .from(cmsProducts)
      .where(and(eq(cmsProducts.slug, trimmed), eq(cmsProducts.status, 'published')))
      .limit(1)

    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      product: {
        slug: row.slug,
        name: row.name,
        contentKind: normalizeProductContentKind(row.contentKind),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        listingPriority: row.listingPriority ?? null,
        showInProjectFeeds: row.showInProjectFeeds,
        document: row.document,
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}
