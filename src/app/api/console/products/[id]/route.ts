import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'
import { normalizeProductContentKind } from '@/lib/productFeeds'
import { PRODUCT_CONTENT_KIND_VALUES } from '@/types/cms'

type RouteContext = { params: Promise<{ id: string }> }

const productContentKindSchema = z.enum(PRODUCT_CONTENT_KIND_VALUES)
const publishedAtSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.null(),
])

const patchSchema = z
  .object({
    document: z.record(z.unknown()).optional(),
    name: z.string().min(1).max(500).optional(),
    status: z.enum(['draft', 'published']).optional(),
    contentKind: productContentKindSchema.optional(),
    publishedAt: publishedAtSchema.optional(),
    listingPriority: z.number().int().nullable().optional(),
    showInProjectFeeds: z.boolean().optional(),
    slug: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
      .optional(),
  })
  .refine(
    (d) =>
      d.document !== undefined ||
      d.name !== undefined ||
      d.status !== undefined ||
      d.contentKind !== undefined ||
      d.publishedAt !== undefined ||
      d.listingPriority !== undefined ||
      d.showInProjectFeeds !== undefined ||
      d.slug !== undefined,
    { message: 'At least one field is required' },
  )

function parseOptionalTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

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

  let rows
  try {
    rows = await db.select().from(cmsProducts).where(eq(cmsProducts.id, id)).limit(1)
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  let existing
  try {
    existing = await db.select().from(cmsProducts).where(eq(cmsProducts.id, id)).limit(1)
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsProducts.$inferInsert> = { updatedAt: now }
  if (parsed.data.document !== undefined) update.document = parsed.data.document
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (parsed.data.status !== undefined) update.status = parsed.data.status
  if (parsed.data.contentKind !== undefined) update.contentKind = parsed.data.contentKind
  if (parsed.data.publishedAt !== undefined) {
    const publishedAt = parseOptionalTimestamp(parsed.data.publishedAt)
    if (publishedAt && Number.isNaN(publishedAt.getTime())) {
      return NextResponse.json({ error: 'Publishing date is invalid' }, { status: 400 })
    }
    update.publishedAt = publishedAt
  }
  if (parsed.data.listingPriority !== undefined) update.listingPriority = parsed.data.listingPriority
  if (parsed.data.showInProjectFeeds !== undefined) {
    update.showInProjectFeeds = parsed.data.showInProjectFeeds
  }
  if (parsed.data.slug !== undefined) update.slug = parsed.data.slug

  try {
    await db.update(cmsProducts).set(update).where(eq(cmsProducts.id, id))
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let rows
  try {
    rows = await db.select().from(cmsProducts).where(eq(cmsProducts.id, id)).limit(1)
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
  const row = rows[0]!
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
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
