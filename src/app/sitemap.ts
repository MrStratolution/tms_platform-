import type { MetadataRoute } from 'next'
import { eq } from 'drizzle-orm'

import { cmsPages, cmsProducts } from '@/db/schema'
import { tryGetCmsDb } from '@/lib/cmsData'
import { PUBLIC_LOCALES } from '@/lib/publicLocale'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'

/** Sitemap hits the DB at request time so `next build` works without Postgres. */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteOrigin()

  const fallback: MetadataRoute.Sitemap = PUBLIC_LOCALES.map((locale) => ({
    url: `${base}/${locale}`,
    lastModified: new Date(),
  }))

  try {
    const cms = tryGetCmsDb()
    if (!cms.ok) return fallback

    const rows = await cms.db
      .select({
        slug: cmsPages.slug,
        updatedAt: cmsPages.updatedAt,
      })
      .from(cmsPages)
      .where(eq(cmsPages.status, 'published'))

    const out: MetadataRoute.Sitemap = [...fallback]

    for (const p of rows) {
      if (!p.slug) continue
      if (p.slug === 'home') continue
      for (const locale of PUBLIC_LOCALES) {
        out.push({
          url: `${base}/${locale}/${p.slug}`,
          lastModified: p.updatedAt,
        })
      }
    }

    try {
      const products = await cms.db
        .select({
          slug: cmsProducts.slug,
          updatedAt: cmsProducts.updatedAt,
        })
        .from(cmsProducts)
        .where(eq(cmsProducts.status, 'published'))

      for (const pr of products) {
        if (!pr.slug) continue
        for (const locale of PUBLIC_LOCALES) {
          out.push({
            url: `${base}/${locale}/products/${pr.slug}`,
            lastModified: pr.updatedAt,
          })
        }
      }
    } catch {
      /* cms_product may be missing before migrate */
    }

    return out
  } catch {
    return fallback
  }
}
