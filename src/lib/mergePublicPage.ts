import { and, eq, isNull, or } from 'drizzle-orm'

import { cmsAbVariants, cmsPageLocalizations } from '@/db/schema'
import { defaultAbCookieName } from '@/lib/abCookies'
import {
  canonicalizeHeroDocument,
  canonicalizePageHero,
  getFirstHeroBlockIndex,
  patchPrimaryHeroBlock,
} from '@/lib/cms/canonicalHeroBlock'
import { hydratePageLayoutRelations } from '@/lib/cms/hydratePageLayoutRelations'
import { resolveLocalizedDocument } from '@/lib/documentLocalization'
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

  let out: Page = canonicalizePageHero({
    ...page,
    hero: { ...(page.hero || {}) },
    seo: { ...(page.seo || {}) },
    layout: Array.isArray(page.layout) ? page.layout.map((block) => ({ ...block })) : page.layout,
  })

  const heroPatch: Record<string, string> = {}
  if (row.heroHeadline != null && row.heroHeadline.trim() !== '') {
    heroPatch.headline = row.heroHeadline
  }
  if (row.heroSubheadline != null && row.heroSubheadline.trim() !== '') {
    heroPatch.subheadline = row.heroSubheadline
  }
  if (Object.keys(heroPatch).length > 0) {
    if (getFirstHeroBlockIndex(out.layout) >= 0) {
      out = { ...out, layout: patchPrimaryHeroBlock(out.layout, heroPatch) }
    } else {
      out.hero = { ...out.hero, ...heroPatch }
    }
  }

  const heroCtaPatch: Record<string, string> = {}
  if (row.primaryCtaLabel != null && row.primaryCtaLabel.trim() !== '') {
    heroCtaPatch.ctaLabel = row.primaryCtaLabel
  }
  if (row.primaryCtaHref != null && row.primaryCtaHref.trim() !== '') {
    heroCtaPatch.ctaHref = row.primaryCtaHref
  }
  if (Object.keys(heroCtaPatch).length > 0) {
    if (getFirstHeroBlockIndex(out.layout) >= 0) {
      out = { ...out, layout: patchPrimaryHeroBlock(out.layout, heroCtaPatch) }
    } else {
      out.primaryCta = {
        ...out.primaryCta,
        ...(heroCtaPatch.ctaLabel ? { label: heroCtaPatch.ctaLabel } : {}),
        ...(heroCtaPatch.ctaHref ? { href: heroCtaPatch.ctaHref } : {}),
      }
    }
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

  let out: Page = canonicalizePageHero({
    ...page,
    hero: { ...(page.hero || {}) },
    seo: { ...(page.seo || {}) },
    layout: Array.isArray(page.layout) ? page.layout.map((block) => ({ ...block })) : page.layout,
  })

  const heroPatch: Record<string, string> = {}
  if (loc.heroHeadline != null && loc.heroHeadline.trim() !== '') {
    heroPatch.headline = loc.heroHeadline
  }
  if (loc.heroSubheadline != null && loc.heroSubheadline.trim() !== '') {
    heroPatch.subheadline = loc.heroSubheadline
  }
  if (loc.seoTitle != null && loc.seoTitle.trim() !== '') {
    out.seo = { ...out.seo, title: loc.seoTitle }
  }
  if (loc.seoDescription != null && loc.seoDescription.trim() !== '') {
    out.seo = { ...out.seo, description: loc.seoDescription }
  }

  const locLayout = loc.layoutJson
  const locHasHeroBlock =
    Array.isArray(locLayout) &&
    getFirstHeroBlockIndex(locLayout as Page['layout']) >= 0
  if (Array.isArray(locLayout) && locLayout.length > 0) {
    out.layout = locLayout as Page['layout']
  }

  if (!locHasHeroBlock && Object.keys(heroPatch).length > 0) {
    if (getFirstHeroBlockIndex(out.layout) >= 0) {
      out = { ...out, layout: patchPrimaryHeroBlock(out.layout, heroPatch) }
    } else {
      out.hero = { ...out.hero, ...heroPatch }
    }
  }

  return canonicalizePageHero(out)
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
    const targetLocale = ctx.queryLang || langCookie
    merged = await mergeLocalizationIntoPage(db, merged, targetLocale)
    merged = canonicalizeHeroDocument(
      resolveLocalizedDocument(merged as unknown as Record<string, unknown>, targetLocale),
      {
        preferLegacyValuesForExistingHero: Boolean(
          targetLocale?.trim() && targetLocale.trim().toLowerCase() !== 'de',
        ),
      },
    ).document as unknown as Page
    return await hydratePageLayoutRelations(db, merged, targetLocale)
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[resolvePageForPublicView] A/B or localization merge skipped:', e)
    }
    return page
  }
}
