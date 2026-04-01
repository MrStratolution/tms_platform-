import { cookies, headers as getHeaders } from 'next/headers'
import type { Metadata } from 'next'
import Link from 'next/link'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'

import { InternalBookFlow } from '@/components/booking/InternalBookFlow'
import { PageLivePreview } from '@/components/pages/PageLivePreview'
import { ProductPublicView } from '@/components/products/ProductPublicView'
import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { getBookingProfileByPublicKey } from '@/lib/bookingProfile'
import { getPreviewPageBySlug, tryGetCmsDb } from '@/lib/cmsData'
import { isMissingDbRelationError } from '@/lib/db/errors'
import { resolvePageForPublicView } from '@/lib/mergePublicPage'
import { buildProductPublicMetadata, buildPublicPageMetadata } from '@/lib/pageMetadata'
import { getPublishedHomePage, getPublishedPageBySlug } from '@/lib/pages'
import { getPublicShortcodeVars } from '@/lib/publicShortcodeVars'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'
import { firstQueryParam } from '@/lib/queryParam'
import type { PublicLocale } from '@/lib/publicLocale'
import { loadSiteSettingsForPublic, mergeRootLayoutMetadata, getPublicSiteSettingsDocument } from '@/lib/siteSettings'
import { serializePageForClient } from '@/lib/serializePage'

const getHomeContext = cache(tryGetCmsDb)

type SearchParamMap = Record<string, string | string[] | undefined>

function previewSecret(): string | null {
  const s = process.env.INTERNAL_PREVIEW_SECRET?.trim()
  return s || null
}

export async function generateLocalizedHomeMetadata(
  locale: PublicLocale,
  searchParams?: Promise<SearchParamMap>,
): Promise<Metadata> {
  const sp = searchParams ? await searchParams : undefined
  const ctx = getHomeContext()
  const site = await loadSiteSettingsForPublic()
  if (!ctx.ok) return mergeRootLayoutMetadata(site)
  let cmsHome: Awaited<ReturnType<typeof getPublishedHomePage>> = null
  try {
    cmsHome = await getPublishedHomePage(ctx.db)
  } catch {
    cmsHome = null
  }
  if (cmsHome) {
    const cookieStore = await cookies()
    const merged = await resolvePageForPublicView(ctx.db, cmsHome, {
      cookieStore,
      queryVariant: firstQueryParam(sp, 'tma_variant'),
      queryLang: locale,
    })
    return buildPublicPageMetadata(merged, `/${locale}`, site)
  }
  return mergeRootLayoutMetadata(site)
}

export async function renderLocalizedHome(
  locale: PublicLocale,
  searchParams?: Promise<SearchParamMap>,
) {
  const sp = searchParams ? await searchParams : undefined
  const ctx = getHomeContext()

  if (!ctx.ok) {
    return (
      <div className="home">
        <div className="content">
          <h1>TMA platform</h1>
          <p className="tagline">
            Next.js + Node.js + PostgreSQL — backend-managed pages, leads, and booking.
          </p>
          <div className="db-alert" role="status">
            <h2>PostgreSQL is not running</h2>
            <p>The site and API routes need a live database. Until Postgres accepts connections, those pages will not work.</p>
          </div>
          <div className="links">
            <Link className="admin" href="/console/login">
              Console login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const headers = await getHeaders()
  const consoleHint = headers.get('x-forwarded-host') || headers.get('host') || 'localhost'

  let cmsHome: Awaited<ReturnType<typeof getPublishedHomePage>> = null
  try {
    cmsHome = await getPublishedHomePage(ctx.db)
  } catch {
    cmsHome = null
  }
  if (cmsHome) {
    const cookieStore = await cookies()
    const merged = await resolvePageForPublicView(ctx.db, cmsHome, {
      cookieStore,
      queryVariant: firstQueryParam(sp, 'tma_variant'),
      queryLang: locale,
    })
    const embedShortcodeVars = await getPublicShortcodeVars()
    return (
      <PageLivePreview
        page={serializePageForClient(merged)}
        embedShortcodeVars={embedShortcodeVars}
      />
    )
  }

  return (
    <div className="home">
      <div className="content">
        <h1>TMA platform</h1>
        <p className="tagline">
          Next.js + Node.js + PostgreSQL — custom admin at <code>/console</code>, CMS data in <code>tma_custom</code>.
        </p>
        <p className="muted" style={{ maxWidth: '28rem', margin: '1rem auto 0' }}>
          Dev host: {consoleHint} · Public URL: {getPublicSiteOrigin()}
        </p>
      </div>
    </div>
  )
}

export async function generateLocalizedPageMetadata(
  locale: PublicLocale,
  slug: string,
): Promise<Metadata> {
  const cms = tryGetCmsDb()
  if (!cms.ok) return { title: 'Not found' }
  const page = await getPublishedPageBySlug(cms.db, slug)
  if (!page) return { title: 'Not found' }
  const cookieStore = await cookies()
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryLang: locale,
  })
  const site = await loadSiteSettingsForPublic()
  return buildPublicPageMetadata(merged, `/${locale}/${slug}`, site)
}

export async function renderLocalizedPage(locale: PublicLocale, slug: string) {
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()
  const page = await getPublishedPageBySlug(cms.db, slug)
  if (!page) notFound()
  const cookieStore = await cookies()
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryLang: locale,
  })
  const embedShortcodeVars = await getPublicShortcodeVars()
  return (
    <PageLivePreview
      page={serializePageForClient(merged)}
      embedShortcodeVars={embedShortcodeVars}
    />
  )
}

export async function generateLocalizedProductMetadata(
  locale: PublicLocale,
  slug: string,
): Promise<Metadata> {
  const db = getCustomDb()
  if (!db) return { title: 'Product' }

  try {
    const rows = await db
      .select({ name: cmsProducts.name, document: cmsProducts.document })
      .from(cmsProducts)
      .where(and(eq(cmsProducts.slug, slug), eq(cmsProducts.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) return { title: 'Not found' }
    const doc = row.document as { seo?: { title?: string; description?: string } }
    const site = await getPublicSiteSettingsDocument(db)
    return buildProductPublicMetadata(
      {
        name: row.name,
        seoTitle: doc?.seo?.title,
        seoDescription: doc?.seo?.description,
        slug,
        localePrefix: `/${locale}`,
      },
      site,
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) return { title: 'Product' }
    throw e
  }
}

export async function renderLocalizedProduct(locale: PublicLocale, slug: string) {
  const db = getCustomDb()
  if (!db) notFound()
  try {
    const rows = await db
      .select({ name: cmsProducts.name, document: cmsProducts.document })
      .from(cmsProducts)
      .where(and(eq(cmsProducts.slug, slug), eq(cmsProducts.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) notFound()
    return (
      <div className="tma-product-page">
        <ProductPublicView name={row.name} document={row.document} locale={locale} />
      </div>
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) notFound()
    throw e
  }
}

export async function generateLocalizedPreviewMetadata(slug: string): Promise<Metadata> {
  return {
    title: `Preview: ${slug}`,
    robots: { index: false, follow: false },
  }
}

export async function renderLocalizedPreview(
  locale: PublicLocale,
  slug: string,
  searchParams?: Promise<SearchParamMap>,
) {
  const secret = previewSecret()
  const sp = searchParams ? await searchParams : undefined
  const provided = firstQueryParam(sp, 'secret') ?? ''
  if (!secret || provided !== secret) notFound()
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()
  const page = await getPreviewPageBySlug(cms.db, slug)
  if (!page) notFound()
  const cookieStore = await cookies()
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: locale,
  })
  const embedShortcodeVars = await getPublicShortcodeVars()
  return (
    <div className="tma-preview-wrap">
      <aside className="tma-preview-banner" role="status" aria-live="polite">
        Draft / preview mode — this URL is not indexed. Matches public <code>PageView</code> and locale-aware merges.
      </aside>
      <PageLivePreview
        page={serializePageForClient(merged)}
        embedShortcodeVars={embedShortcodeVars}
      />
    </div>
  )
}

export async function generateLocalizedBookingMetadata(key: string): Promise<Metadata> {
  const cms = tryGetCmsDb()
  if (!cms.ok) return { title: 'Book' }
  const profile = await getBookingProfileByPublicKey(cms.db, decodeURIComponent(key))
  if (!profile || profile.provider !== 'internal') return { title: 'Book' }
  return {
    title: `Book — ${profile.name}`,
    description: `Schedule a ${profile.durationMinutes ?? 30}-minute session with ${profile.name}.`,
  }
}

export async function renderLocalizedBooking(key: string) {
  const decoded = decodeURIComponent(key)
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()
  const profile = await getBookingProfileByPublicKey(cms.db, decoded)
  if (!profile || profile.provider !== 'internal') notFound()
  return (
    <article className="tma-page book-page">
      <header className="tma-page-title">
        <h1>{profile.name}</h1>
        {profile.assignedOwner ? <p className="tma-lead">With {profile.assignedOwner}</p> : null}
      </header>
      <InternalBookFlow
        profileKey={decoded}
        profileName={profile.name}
        thankYouPageSlug={profile.thankYouPageSlug}
      />
    </article>
  )
}
