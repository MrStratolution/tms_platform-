import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsPages } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { createAuditLog } from '@/lib/console/pageAudit'
import { userHasConsolePermission } from '@/lib/console/rbac'
import { starterPageDocument } from '@/lib/cms/pageTemplates'
import { mergedPageDocumentSchema } from '@/lib/cms/pageSurfaceMerge'
import { validatePageSlug } from '@/lib/cms/pageSlug'

const pageTypeEnum = z.enum([
  'home',
  'services',
  'landing',
  'resource',
  'contact',
  'other',
  'product',
  'industry',
  'thank_you',
  'blank',
])

const createBodySchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  pageType: pageTypeEnum,
  status: z.enum(['draft', 'review', 'published']).default('draft'),
  template: z
    .enum([
      'blank',
      'landing',
      'service',
      'services_directory',
      'industries_directory',
      'work_showcase',
      'projects_directory',
      'news_index',
      'news_article',
      'contact',
      'thank_you',
    ])
    .default('blank'),
})

/**
 * GET /api/console/pages
 */
export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rows = await db
      .select({
        id: cmsPages.id,
        slug: cmsPages.slug,
        title: cmsPages.title,
        pageType: cmsPages.pageType,
        status: cmsPages.status,
        updatedAt: cmsPages.updatedAt,
        createdAt: cmsPages.createdAt,
      })
      .from(cmsPages)
      .orderBy(desc(cmsPages.updatedAt))

    return NextResponse.json({
      ok: true,
      pages: rows.map((r) => ({
        ...r,
        updatedAt: r.updatedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/console/pages — create a new page (console authors).
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

  const parsed = createBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (
    parsed.data.status === 'published' &&
    !userHasConsolePermission(auth.user.role, 'content:publish')
  ) {
    return NextResponse.json(
      { error: 'Only admin or ops can create a page as published.' },
      { status: 403 },
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

  const document = starterPageDocument(parsed.data.template)
  const docCheck = mergedPageDocumentSchema.safeParse(document)
  if (!docCheck.success) {
    return NextResponse.json({ error: 'Invalid starter document' }, { status: 500 })
  }

  const existing = await db
    .select({ id: cmsPages.id })
    .from(cmsPages)
    .where(eq(cmsPages.slug, slugCheck.slug))
    .limit(1)
  if (existing[0]) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsPages)
      .values({
        slug: slugCheck.slug,
        title: parsed.data.title.trim(),
        pageType: parsed.data.pageType,
        status: parsed.data.status,
        document: docCheck.data,
        lastEditedByUserId: auth.user.sub,
        lastEditedByEmail: auth.user.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!row) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    await createAuditLog(db, {
      action: 'page.create',
      entityType: 'cms_page',
      entityId: row.id,
      actorUserId: auth.user.sub,
      actorEmail: auth.user.email,
      payload: { status: row.status, pageType: row.pageType },
    })

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
    const message = e instanceof Error ? e.message : 'Insert failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
