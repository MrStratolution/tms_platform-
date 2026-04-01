import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsPageRevisions, cmsPages } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { createAuditLog, createPageRevision } from '@/lib/console/pageAudit'

type RouteContext = { params: Promise<{ id: string }> }

const restoreSchema = z.object({
  revisionId: z.number().int().positive(),
})

function revisionJson(row: typeof cmsPageRevisions.$inferSelect) {
  return {
    id: row.id,
    pageId: row.pageId,
    title: row.title,
    slug: row.slug,
    pageType: row.pageType,
    status: row.status,
    document: row.document,
    reason: row.reason,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response
  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const rows = await db
    .select()
    .from(cmsPageRevisions)
    .where(eq(cmsPageRevisions.pageId, id))
    .orderBy(desc(cmsPageRevisions.createdAt))
    .limit(25)

  return NextResponse.json({ ok: true, revisions: rows.map(revisionJson) })
}

export async function POST(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response
  const pageId = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(pageId) || pageId < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  let json: unknown
  try { json = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = restoreSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }
  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const pageRows = await db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).limit(1)
  const page = pageRows[0]
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

  const revisionRows = await db
    .select()
    .from(cmsPageRevisions)
    .where(eq(cmsPageRevisions.id, parsed.data.revisionId))
    .limit(1)
  const revision = revisionRows[0]
  if (!revision || revision.pageId !== pageId) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
  }

  await createPageRevision(db, {
    pageId: page.id,
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    status: page.status,
    document: page.document,
    reason: 'before_restore',
    actorUserId: auth.user.sub,
    actorEmail: auth.user.email,
  })

  await db
    .update(cmsPages)
    .set({
      title: revision.title,
      slug: revision.slug,
      pageType: revision.pageType,
      status: revision.status,
      document: revision.document,
      lastEditedByUserId: auth.user.sub,
      lastEditedByEmail: auth.user.email,
      updatedAt: new Date(),
    })
    .where(eq(cmsPages.id, pageId))

  await createAuditLog(db, {
    action: 'page.restore_revision',
    entityType: 'cms_page',
    entityId: pageId,
    actorUserId: auth.user.sub,
    actorEmail: auth.user.email,
    payload: { revisionId: revision.id },
  })

  const refreshed = await db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).limit(1)
  const row = refreshed[0]!
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
