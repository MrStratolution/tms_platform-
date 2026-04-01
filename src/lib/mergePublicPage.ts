import { and, eq, isNull, or } from 'drizzle-orm'

import { cmsAbVariants, cmsPageLocalizations } from '@/db/schema'
import { defaultAbCookieName } from '@/lib/abCookies'
import { hydratePageLayoutRelations } from '@/lib/cms/hydratePageLayoutRelations'
import type { Page } from '@/types/cms'

import type { CmsDb } from './cmsData'

/**
 * Apply active A/B variant overlays for the default experiment (cookie / query).
 */
export async function mergeAbVariantIntoPage(
  db: CmsDb,
  page: Page,
  opts: {
    cookieVariant?: string | null
    queryVariant?: string | null
    experimentSlug?: string
  },
): Promise<Page> {
  const experimentSlug = opts.experimentSlug ?? 'default'
  const expClause =
    experimentSlug === 'default'
      ? or(
          eq(cmsAbVariants.experimentSlug, 'default'),
          isNull(cmsAbVariants.experimentSlug),
        )
      : eq(cmsAbVariants.experimentSlug, experimentSlug)

  const rows = await db
    .select()
    .from(cmsAbVariants)
    .where(
      and(eq(cmsAbVariants.pageId, page.id), eq(cmsAbVariants.active, true), expClause),
    )

  const docs = rows
  if (docs.length === 0) return page

  const keys = new Set(docs.map((d) => d.variantKey))
  const raw = (opts.queryVariant || opts.cookieVariant || 'a').toLowerCase()
  const arm: 'a' | 'b' = raw === 'b' ? 'b' : 'a'
  const firstKey = docs[0]?.variantKey
  const fallback: 'a' | 'b' = firstKey === 'b' ? 'b' : 'a'
  const chosen: 'a' | 'b' = keys.has(arm)
    ? arm
    : keys.has('a')
      ? 'a'
      : fallback
  const row = docs.find((d) => d.variantKey === chosen)
  if (!row) return page

  const out: Page = { ...page, hero: { ...(page.hero || {}) }, seo: { ...(page.seo || {}) } }

  if (row.heroHeadline != null && row.heroHeadline.trim() !== '') {
    out.hero = { ...out.hero, headline: row.heroHeadline }
  }
  if (row.heroSubheadline != null && row.heroSubheadline.trim() !== '') {
    out.hero = { ...out.hero, subheadline: row.heroSubheadline }
  }
  if (row.primaryCtaLabel != null && row.primaryCtaLabel.trim() !== '') {
    out.primaryCta = { ...out.primaryCta, label: row.primaryCtaLabel }
  }
  if (row.primaryCtaHref != null && row.primaryCtaHref.trim() !== '') {
    out.primaryCta = { ...out.primaryCta, href: row.primaryCtaHref }
  }
  if (row.seoTitle != null && row.seoTitle.trim() !== '') {
    out.seo = { ...out.seo, title: row.seoTitle }
  }
  if (row.seoDescription != null && row.seoDescription.trim() !== '') {
    out.seo = { ...out.seo, description: row.seoDescription }
  }

  return out
}

/**
 * Overlay hero + SEO from a ready Page localization (e.g. ?lang=de).
 */
export async function mergeLocalizationIntoPage(
  db: CmsDb,
  page: Page,
  locale: string | null | undefined,
): Promise<Page> {
  const target = locale?.trim()
  if (!target) return page

  const rows = await db
    .select()
    .from(cmsPageLocalizations)
    .where(
      and(
        eq(cmsPageLocalizations.pageId, page.id),
        eq(cmsPageLocalizations.locale, target),
        eq(cmsPageLocalizations.jobStatus, 'ready'),
      ),
    )
    .limit(1)

  const loc = rows[0]
  if (!loc) return page

  const out: Page = { ...page, hero: { ...(page.hero || {}) }, seo: { ...(page.seo || {}) } }

  if (loc.heroHeadline != null && loc.heroHeadline.trim() !== '') {
    out.hero = { ...out.hero, headline: loc.heroHeadline }
  }
  if (loc.heroSubheadline != null && loc.heroSubheadline.trim() !== '') {
    out.hero = { ...out.hero, subheadline: loc.heroSubheadline }
  }
  if (loc.seoTitle != null && loc.seoTitle.trim() !== '') {
    out.seo = { ...out.seo, title: loc.seoTitle }
  }
  if (loc.seoDescription != null && loc.seoDescription.trim() !== '') {
    out.seo = { ...out.seo, description: loc.seoDescription }
  }

  const locLayout = loc.layoutJson
  if (Array.isArray(locLayout) && locLayout.length > 0) {
    out.layout = locLayout as Page['layout']
  }

  return out
}

export async function resolvePageForPublicView(
  db: CmsDb,
  page: Page,
  ctx: {
    cookieStore: { get: (name: string) => { value: string } | undefined }
    queryVariant?: string | null
    queryLang?: string | null
  },
): Promise<Page> {
  try {
    const cName = defaultAbCookieName(page.slug)
    const cookieVariant = ctx.cookieStore.get(cName)?.value

    let merged = await mergeAbVariantIntoPage(db, page, {
      cookieVariant,
      queryVariant: ctx.queryVariant,
    })
    const langCookie = ctx.cookieStore.get('tma_lang')?.value
    merged = await mergeLocalizationIntoPage(db, merged, ctx.queryLang || langCookie)
    return await hydratePageLayoutRelations(db, merged)
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[resolvePageForPublicView] A/B or localization merge skipped:', e)
    }
    return page
  }
}
