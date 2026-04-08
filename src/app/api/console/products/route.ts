import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'
import { normalizeProductContentKind } from '@/lib/productFeeds'
import { PRODUCT_CONTENT_KIND_VALUES } from '@/types/cms'

const productContentKindSchema = z.enum(PRODUCT_CONTENT_KIND_VALUES)
const publishedAtSchema = z
  .union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()

const createProductSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  status: z.enum(['draft', 'published']).default('draft'),
  contentKind: productContentKindSchema.default('product'),
  publishedAt: publishedAtSchema,
  listingPriority: z.number().int().nullable().optional(),
  showInProjectFeeds: z.boolean().default(false),
  document: z.record(z.unknown()).optional(),
})

function parseOptionalTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

function localeAvailability(document: unknown) {
  const base = document && typeof document === 'object' && !Array.isArray(document)
    ? (document as Record<string, unknown>)
    : null
  const localizations =
    base?.localizations && typeof base.localizations === 'object' && !Array.isArray(base.localizations)
      ? (base.localizations as Record<string, unknown>)
      : null
  return {
    de: true,
    en: Boolean(localizations?.en && typeof localizations.en === 'object' && !Array.isArray(localizations.en)),
  }
}

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
        contentKind: cmsProducts.contentKind,
        publishedAt: cmsProducts.publishedAt,
        listingPriority: cmsProducts.listingPriority,
        showInProjectFeeds: cmsProducts.showInProjectFeeds,
        document: cmsProducts.document,
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
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      contentKind: normalizeProductContentKind(r.contentKind),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      listingPriority: r.listingPriority ?? null,
      showInProjectFeeds: r.showInProjectFeeds,
      localeAvailability: localeAvailability(r.document),
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
  const publishedAt = parseOptionalTimestamp(parsed.data.publishedAt ?? null)
  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    return NextResponse.json({ error: 'Publishing date is invalid' }, { status: 400 })
  }

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsProducts)
      .values({
        slug: slugCheck.slug,
        name: parsed.data.name.trim(),
        status: parsed.data.status,
        contentKind: parsed.data.contentKind,
        publishedAt,
        listingPriority: parsed.data.listingPriority ?? null,
        showInProjectFeeds: parsed.data.showInProjectFeeds,
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
        contentKind: normalizeProductContentKind(row.contentKind),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        listingPriority: row.listingPriority ?? null,
        showInProjectFeeds: row.showInProjectFeeds,
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
