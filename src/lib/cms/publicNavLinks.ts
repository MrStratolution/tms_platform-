import { eq } from 'drizzle-orm'

import { cmsPages } from '@/db/schema'

import type { CmsDb } from '@/lib/cmsData'
import type { PublicLocale } from '@/lib/publicLocale'
import type { SiteSettingsDocument } from '@/lib/siteSettings'

import { normalizeNavHref } from '@/lib/cms/navHref'

export type PublicNavLink = {
  href: string
  label: string
  badge?: string
  newTab?: boolean
  showOnDesktop?: boolean
  showOnMobile?: boolean
}

const STATIC_FALLBACK: PublicNavLink[] = [
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
  { href: '/book/strategy-call', label: 'Book a call' },
]

type CmsNavRow = { slug: string; document: unknown }

function navOrderFromDoc(doc: Record<string, unknown> | null): number {
  const n = doc?.navOrder
  return typeof n === 'number' && Number.isFinite(n) ? n : 9999
}

/**
 * Build sorted, deduped CMS nav entries. Same `href` keeps the first row after sort
 * (lower `navOrder`, then label).
 */
export function buildCmsNavEntries(rows: CmsNavRow[]): PublicNavLink[] {
  type Item = PublicNavLink & { sortKey: number }
  const items: Item[] = []

  for (const r of rows) {
    if (r.slug === 'home') continue
    const doc = r.document as Record<string, unknown> | null
    const label =
      doc && typeof doc.navigationLabel === 'string' ? doc.navigationLabel.trim() : ''
    if (!label) continue

    const rawHref =
      doc && typeof doc.navigationHref === 'string' ? doc.navigationHref.trim() : ''
    const href = rawHref ? normalizeNavHref(rawHref) : `/${r.slug}`
    const sortKey = navOrderFromDoc(doc)
    items.push({ href, label, sortKey })
  }

  items.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })

  const seen = new Set<string>()
  const out: PublicNavLink[] = []
  for (const it of items) {
    if (seen.has(it.href)) continue
    seen.add(it.href)
    out.push({ href: it.href, label: it.label })
  }
  return out
}

/**
 * Published pages with `navigationLabel` drive header links.
 * `navigationHref` overrides `/{slug}` (e.g. `/book/strategy-call`).
 * `navOrder` sorts CMS items (lower first); ties break by label.
 * Static fallbacks fill gaps for hrefs not already covered by CMS.
 */
export async function getPublicNavLinksFromCms(db: CmsDb): Promise<PublicNavLink[]> {
  const rows = await db
    .select({
      slug: cmsPages.slug,
      document: cmsPages.document,
    })
    .from(cmsPages)
    .where(eq(cmsPages.status, 'published'))

  const fromCms = buildCmsNavEntries(rows)

  const cmsHrefs = new Set(fromCms.map((l) => l.href))
  const mergedTail = STATIC_FALLBACK.filter((s) => !cmsHrefs.has(s.href))

  return [...fromCms, ...mergedTail]
}

export function getStaticNavFallbackOnly(): PublicNavLink[] {
  return [...STATIC_FALLBACK]
}

export function getManualNavLinksFromSiteSettings(
  site: SiteSettingsDocument | null | undefined,
  locale: PublicLocale,
): PublicNavLink[] {
  const items = site?.header?.navigationItems
  if (!items?.length) return []

  const links: PublicNavLink[] = []
  for (const item of items) {
    const label =
      locale === 'en' ? item.labelEn?.trim() || item.label.trim() : item.label.trim()
    if (!label) continue
    links.push({
      href: normalizeNavHref(item.href),
      label,
      badge:
        (locale === 'en' ? item.badgeEn?.trim() || item.badge?.trim() : item.badge?.trim()) ||
        undefined,
      newTab: item.newTab === true,
      showOnDesktop: item.showOnDesktop !== false,
      showOnMobile: item.showOnMobile !== false,
    })
  }
  return links
}
