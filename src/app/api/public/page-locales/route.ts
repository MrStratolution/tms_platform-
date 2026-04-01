import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { cmsPageLocalizations, cmsPages } from '@/db/schema'
import { tryGetCmsDb } from '@/lib/cmsData'
import type { Page } from '@/types/cms'

/**
 * GET ?slug=home — locales with ready translations for this published page (for the language switcher).
 */
export async function GET(request: Request) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const slug = new URL(request.url).searchParams.get('slug')?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const pages = await db
    .select({
      id: cmsPages.id,
      document: cmsPages.document,
      status: cmsPages.status,
    })
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'published')))
    .limit(1)

  const row = pages[0]
  if (!row) {
    return NextResponse.json({
      ok: true,
      slug,
      baseLocale: 'de',
      readyLocales: [],
      statuses: {},
    })
  }

  const doc = row.document as Partial<Page>
  const baseLocale = doc.localizationAutomation?.sourceLocale?.trim() || 'de'

  const locRows = await db
    .select({
      locale: cmsPageLocalizations.locale,
      jobStatus: cmsPageLocalizations.jobStatus,
    })
    .from(cmsPageLocalizations)
    .where(eq(cmsPageLocalizations.pageId, row.id))

  const byLocale = new Map<string, string>()
  for (const r of locRows) {
    byLocale.set(r.locale, r.jobStatus ?? '')
  }

  const readyLocales = locRows.filter((r) => r.jobStatus === 'ready').map((r) => r.locale)

  return NextResponse.json({
    ok: true,
    slug,
    baseLocale,
    /** Locales that have a completed translation (hero + SEO + layout when layout existed). */
    readyLocales: [...new Set(readyLocales)],
    /** All known jobs for this page by locale → status */
    statuses: Object.fromEntries(byLocale),
  })
}
