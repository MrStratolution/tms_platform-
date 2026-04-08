import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'
import { normalizeProductContentKind } from '@/lib/productFeeds'

/**
 * Public: published products/offers for storefronts or JSON consumers (strategy §7).
 */
export async function GET() {
  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let rows
  try {
    rows = await db
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
      .where(eq(cmsProducts.status, 'published'))
      .orderBy(asc(cmsProducts.name))
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }

  return NextResponse.json({
    ok: true,
    products: rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      contentKind: normalizeProductContentKind(r.contentKind),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      listingPriority: r.listingPriority ?? null,
      showInProjectFeeds: r.showInProjectFeeds,
      document: r.document,
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}
