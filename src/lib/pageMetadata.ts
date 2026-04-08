import type { Metadata } from 'next'

import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'
import type { SiteSettingsDocument } from '@/lib/siteSettings'
import type { Media, Page } from '@/types/cms'

/**
 * Shared metadata for public pages (home + dynamic `[slug]`).
 * Uses `seo.canonicalUrl`, `seo.ogImageUrl`, or `seo.ogImage.url` when set.
 * Optional `siteDefaults` fills description / OG image when the page omits them.
 */
export function buildPublicPageMetadata(
  merged: Pick<Page, 'title' | 'seo'>,
  pathForCanonical: string,
  siteDefaults?: SiteSettingsDocument | null,
): Metadata {
  const origin = getPublicSiteOrigin()
  const path =
    pathForCanonical === '' || pathForCanonical === 'home' || pathForCanonical === '/'
      ? '/'
      : pathForCanonical.startsWith('/')
        ? pathForCanonical
        : `/${pathForCanonical}`
  const defaultCanonical = `${origin}${path === '/' ? '' : path}`
  const canonical =
    typeof merged.seo?.canonicalUrl === 'string' && merged.seo.canonicalUrl.trim()
      ? merged.seo.canonicalUrl.trim()
      : defaultCanonical

  const title = merged.seo?.title?.trim() || merged.title
  const description =
    merged.seo?.description?.trim() ||
    siteDefaults?.defaultDescription?.trim() ||
    undefined

  let ogImage: string | undefined
  const ogUrl =
    typeof merged.seo?.ogImageUrl === 'string' && merged.seo.ogImageUrl.trim()
      ? merged.seo.ogImageUrl.trim()
      : undefined
  if (ogUrl) {
    ogImage = absoluteMediaUrl(ogUrl) ?? undefined
  } else {
    const og = merged.seo?.ogImage
    if (og && typeof og === 'object' && 'url' in og) {
      const u = (og as Media).url
      if (typeof u === 'string' && u.trim()) {
        ogImage = absoluteMediaUrl(u) ?? undefined
      }
    }
  }
  if (!ogImage) {
    const siteOg = siteDefaults?.ogImageUrl?.trim()
    if (siteOg) {
      ogImage = absoluteMediaUrl(siteOg) ?? undefined
    }
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

/** Published product detail pages — merges site-wide description / OG fallback. */
export function buildProductPublicMetadata(
  input: {
    name: string
    seoTitle?: string | null
    seoDescription?: string | null
    slug: string
    localePrefix?: string | null
  },
  siteDefaults?: SiteSettingsDocument | null,
): Metadata {
  const origin = getPublicSiteOrigin()
  const prefix = input.localePrefix?.trim() ? input.localePrefix.trim() : ''
  const canonical = `${origin}${prefix}/products/${input.slug}`
  const title = input.seoTitle?.trim() || input.name
  const description =
    input.seoDescription?.trim() || siteDefaults?.defaultDescription?.trim() || undefined

  let ogImage: string | undefined
  const siteOg = siteDefaults?.ogImageUrl?.trim()
  if (siteOg) {
    ogImage = absoluteMediaUrl(siteOg) ?? undefined
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

export function buildCaseStudyPublicMetadata(
  input: {
    title: string
    summary?: string | null
    slug: string
    localePrefix?: string | null
    featuredImageUrl?: string | null
  },
  siteDefaults?: SiteSettingsDocument | null,
): Metadata {
  const origin = getPublicSiteOrigin()
  const prefix = input.localePrefix?.trim() ? input.localePrefix.trim() : ''
  const canonical = `${origin}${prefix}/work/${input.slug}`
  const title = input.title
  const description =
    input.summary?.trim() || siteDefaults?.defaultDescription?.trim() || undefined

  let ogImage: string | undefined
  const featured = input.featuredImageUrl?.trim()
  if (featured) {
    ogImage = absoluteMediaUrl(featured) ?? undefined
  }
  if (!ogImage) {
    const siteOg = siteDefaults?.ogImageUrl?.trim()
    if (siteOg) {
      ogImage = absoluteMediaUrl(siteOg) ?? undefined
    }
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}
