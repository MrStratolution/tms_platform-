import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsPageLocalizations, cmsPages } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { getCustomDb } from '@/db/client'
import { queueLocalesForPage, upsertQueuedPageLocalization } from '@/lib/queuePageLocalizations'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET — list localization jobs for a page (console).
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

  const page = await db.select({ id: cmsPages.id }).from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  if (!page[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rows = await db
    .select({
      id: cmsPageLocalizations.id,
      locale: cmsPageLocalizations.locale,
      sourceLocale: cmsPageLocalizations.sourceLocale,
      jobStatus: cmsPageLocalizations.jobStatus,
      lastError: cmsPageLocalizations.lastError,
      updatedAt: cmsPageLocalizations.updatedAt,
    })
    .from(cmsPageLocalizations)
    .where(eq(cmsPageLocalizations.pageId, id))
    .orderBy(desc(cmsPageLocalizations.updatedAt))

  return NextResponse.json({
    ok: true,
    localizations: rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}

const postBodySchema = z.union([
  z.object({
    locale: z.string().min(2).max(32),
    sourceLocale: z.string().min(2).max(32).optional(),
  }),
  z.object({
    locales: z.array(z.string().min(2).max(32)).min(1).max(20),
    sourceLocale: z.string().min(2).max(32).optional(),
  }),
])

/**
 * POST — queue one or more translation jobs (hero + SEO + layout).
 */
export async function POST(request: Request, ctx: RouteContext) {
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

  const parsed = postBodySchema.safeParse(json)
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

  const page = await db.select({ id: cmsPages.id }).from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  if (!page[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if ('locales' in parsed.data) {
      const queued = await queueLocalesForPage(
        db,
        id,
        parsed.data.locales,
        parsed.data.sourceLocale,
      )
      return NextResponse.json({ ok: true, queued })
    }
    const one = await upsertQueuedPageLocalization(db, {
      pageId: id,
      locale: parsed.data.locale,
      sourceLocale: parsed.data.sourceLocale,
    })
    return NextResponse.json({ ok: true, queued: [one] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Queue failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
