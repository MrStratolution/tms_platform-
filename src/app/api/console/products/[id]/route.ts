import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    document: z.record(z.unknown()).optional(),
    name: z.string().min(1).max(500).optional(),
    status: z.enum(['draft', 'published']).optional(),
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
      d.slug !== undefined,
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
      document: row.document,
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
