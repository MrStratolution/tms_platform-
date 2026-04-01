import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { PageLivePreview } from '@/components/pages/PageLivePreview'
import { tryGetCmsDb } from '@/lib/cmsData'
import { resolvePageForPublicView } from '@/lib/mergePublicPage'
import { getPublishedPageBySlug } from '@/lib/pages'
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
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: firstQueryParam(sp, 'lang'),
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
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: firstQueryParam(sp, 'lang'),
  })

  const embedShortcodeVars = await getPublicShortcodeVars()

  return (
    <PageLivePreview
      page={serializePageForClient(merged)}
      embedShortcodeVars={embedShortcodeVars}
    />
  )
}
