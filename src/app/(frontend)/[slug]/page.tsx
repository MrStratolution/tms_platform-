import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { PageLivePreview } from '@/components/pages/PageLivePreview'
import { tryGetCmsDb } from '@/lib/cmsData'
import { isAnalyticsAllowed } from '@/lib/cookieConsent'
import { resolvePageForPublicView } from '@/lib/mergePublicPage'
import { getPublishedPageBySlug } from '@/lib/pages'
import { normalizePublicLocale } from '@/lib/publicLocale'
import { firstQueryParam } from '@/lib/queryParam'
import { buildPublicPageMetadata } from '@/lib/pageMetadata'
import { getPublicShortcodeVars } from '@/lib/publicShortcodeVars'
import { loadSiteSettingsForPublic } from '@/lib/siteSettings'
import { serializePageForClient } from '@/lib/serializePage'

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = searchParams ? await searchParams : undefined
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return { title: 'Not found' }
  }
  const page = await getPublishedPageBySlug(cms.db, slug)
  if (!page) {
    return { title: 'Not found' }
  }
  const cookieStore = await cookies()
  const headerStore = await headers()
  const locale = normalizePublicLocale(
    firstQueryParam(sp, 'lang') ??
      headerStore.get('x-tma-active-lang') ??
      cookieStore.get('tma_lang')?.value,
  )
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: locale,
  })
  const site = await loadSiteSettingsForPublic()
  return buildPublicPageMetadata(merged, slug, site)
}

export default async function DynamicPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : undefined
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()

  const page = await getPublishedPageBySlug(cms.db, slug)
  if (!page) notFound()

  const cookieStore = await cookies()
  const headerStore = await headers()
  const locale = normalizePublicLocale(
    firstQueryParam(sp, 'lang') ??
      headerStore.get('x-tma-active-lang') ??
      cookieStore.get('tma_lang')?.value,
  )
  const site = await loadSiteSettingsForPublic()
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: locale,
  })

  const embedShortcodeVars = await getPublicShortcodeVars()

  return (
    <PageLivePreview
      page={serializePageForClient(merged)}
      embedShortcodeVars={embedShortcodeVars}
      locale={locale}
      trackingConsentGranted={isAnalyticsAllowed(
        cookieStore.get('tma_cookie_consent')?.value,
        site,
      )}
    />
  )
}
