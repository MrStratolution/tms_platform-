import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsPages } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { mergedPageDocumentSchema } from '@/lib/cms/pageSurfaceMerge'
import { validatePageSlug } from '@/lib/cms/pageSlug'

type RouteContext = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  slug: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(500).optional(),
})

async function pickDuplicateSlug(db: NonNullable<ReturnType<typeof getCustomDb>>, base: string) {
  let candidate = `${base}-copy`
  let n = 2
  for (;;) {
    const taken = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, candidate))
      .limit(1)
    if (!taken[0]) return candidate
    candidate = `${base}-copy-${n}`
    n += 1
  }
}

/**
 * POST /api/console/pages/[id]/duplicate — copy row to a new slug (draft).
 */
export async function POST(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let json: unknown = {}
  try {
    const text = await request.text()
    if (text.trim()) json = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json && typeof json === 'object' ? json : {})
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

  const rows = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  const src = rows[0]
  if (!src) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let nextSlug: string
  if (parsed.data.slug) {
    const check = validatePageSlug(parsed.data.slug)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
    const taken = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, check.slug))
      .limit(1)
    if (taken[0]) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    nextSlug = check.slug
  } else {
    nextSlug = await pickDuplicateSlug(db, src.slug)
  }

  const doc =
    src.document != null && typeof src.document === 'object' && !Array.isArray(src.document)
      ? (src.document as Record<string, unknown>)
      : {}
  const checked = mergedPageDocumentSchema.safeParse(doc)
  if (!checked.success) {
    return NextResponse.json({ error: 'Source document is invalid' }, { status: 500 })
  }

  const title =
    parsed.data.title?.trim() ||
    (src.title.toLowerCase().includes('copy') ? src.title : `${src.title} (copy)`)

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsPages)
      .values({
        slug: nextSlug,
        title,
        pageType: src.pageType,
        status: 'draft',
        document: checked.data,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!row) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

    return NextResponse.json({
      ok: true,
      page: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        pageType: row.pageType,
        status: row.status,
        document: row.document,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Duplicate failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
