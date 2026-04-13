import { NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsAbVariants, cmsPageLocalizations, cmsPages } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { createAuditLog, createPageRevision } from '@/lib/console/pageAudit'
import { consoleUserCanEditCustomCss, userHasConsolePermission } from '@/lib/console/rbac'
import { validatePageSlug } from '@/lib/cms/pageSlug'
import { normalizePageBuilderDocument } from '@/lib/cms/pageSurfaceMerge'
import { queueLocalesForPage } from '@/lib/queuePageLocalizations'
import type { Page } from '@/types/cms'

type RouteContext = { params: Promise<{ id: string }> }

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

const patchSchema = z
  .object({
    document: z.record(z.unknown()).optional(),
    title: z.string().min(1).max(500).optional(),
    status: z.enum(['draft', 'review', 'published', 'archived', 'trashed']).optional(),
    slug: z.string().min(1).max(200).optional(),
    pageType: pageTypeEnum.optional(),
  })
  .refine(
    (d) =>
      d.document !== undefined ||
      d.title !== undefined ||
      d.status !== undefined ||
      d.slug !== undefined ||
      d.pageType !== undefined,
    { message: 'At least one of document, title, status, slug, pageType is required' },
  )

/**
 * GET /api/console/pages/[id]
 */
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

  const rows = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    page: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      pageType: row.pageType,
      status: row.status,
      document: row.document,
      lastEditedByEmail: row.lastEditedByEmail,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}

/**
 * PATCH /api/console/pages/[id]
 */
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

  const existing = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  if (!existing[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (parsed.data.status !== undefined) {
    const prev = String(existing[0].status)
    const next = String(parsed.data.status)
    const touchesLive =
      next === 'published' ||
      (prev === 'published' && next !== 'published')
    if (touchesLive && !userHasConsolePermission(auth.user.role, 'content:publish')) {
      return NextResponse.json(
        {
          error:
            'Only admin or ops can publish, unpublish, or move a live page to another status.',
        },
        { status: 403 },
      )
    }
  }

  const { document: rawDocument, title, status, slug: newSlug, pageType } = parsed.data
  const now = new Date()
  const update: Partial<typeof cmsPages.$inferInsert> = {
    updatedAt: now,
    lastEditedByUserId: auth.user.sub,
    lastEditedByEmail: auth.user.email,
  }
  let document = rawDocument
  if (document !== undefined && !consoleUserCanEditCustomCss(auth.user.role)) {
    const d = { ...document } as Record<string, unknown>
    delete d.customCss
    document = d
  }
  if (document !== undefined) {
    document = normalizePageBuilderDocument(document as Record<string, unknown>)
  }
  if (document !== undefined) update.document = document
  if (title !== undefined) update.title = title
  if (status !== undefined) update.status = status
  if (pageType !== undefined) update.pageType = pageType

  const wasPublished = existing[0].status === 'published'

  if (newSlug !== undefined) {
    const slugCheck = validatePageSlug(newSlug)
    if (!slugCheck.ok) {
      return NextResponse.json({ error: slugCheck.error }, { status: 400 })
    }
    const taken = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, slugCheck.slug), ne(cmsPages.id, id)))
      .limit(1)
    if (taken[0]) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
    update.slug = slugCheck.slug
  }

  try {
    await createPageRevision(db, {
      pageId: existing[0].id,
      title: existing[0].title,
      slug: existing[0].slug,
      pageType: existing[0].pageType,
      status: existing[0].status,
      document: existing[0].document,
      reason: 'before_update',
      actorUserId: auth.user.sub,
      actorEmail: auth.user.email,
    })
    await db.update(cmsPages).set(update).where(eq(cmsPages.id, id))
    await createAuditLog(db, {
      action: 'page.update',
      entityType: 'cms_page',
      entityId: id,
      actorUserId: auth.user.sub,
      actorEmail: auth.user.email,
      payload: {
        changedKeys: Object.keys(parsed.data),
        nextStatus: update.status ?? existing[0].status,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const rows = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  const row = rows[0]!
  const nowPublished = row.status === 'published'
  if (nowPublished && !wasPublished) {
    const doc = row.document as Partial<Page>
    const la = doc.localizationAutomation
    if (la?.autoQueueOnPublish && Array.isArray(la.targetLocales) && la.targetLocales.length > 0) {
      try {
        await queueLocalesForPage(db, id, la.targetLocales, la.sourceLocale)
      } catch (e) {
        console.error('[PATCH /api/console/pages] auto-queue localizations', e)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    page: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      pageType: row.pageType,
      status: row.status,
      document: row.document,
      lastEditedByEmail: row.lastEditedByEmail,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}

/**
 * DELETE /api/console/pages/[id] — permanent delete (team admin only).
 */
export async function DELETE(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'team:admin')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const existing = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  if (!existing[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await db.delete(cmsAbVariants).where(eq(cmsAbVariants.pageId, id))
    await db.delete(cmsPageLocalizations).where(eq(cmsPageLocalizations.pageId, id))
    await db.delete(cmsPages).where(eq(cmsPages.id, id))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
