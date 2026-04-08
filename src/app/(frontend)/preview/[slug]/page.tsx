import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageLivePreview } from '@/components/pages/PageLivePreview'
import { tryGetCmsDb, getPreviewPageBySlug } from '@/lib/cmsData'
import { resolvePageForPublicView } from '@/lib/mergePublicPage'
import { normalizePublicLocale } from '@/lib/publicLocale'
import { firstQueryParam } from '@/lib/queryParam'
import { getPublicShortcodeVars } from '@/lib/publicShortcodeVars'
import { serializePageForClient } from '@/lib/serializePage'

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

function previewSecret(): string | null {
  const s = process.env.INTERNAL_PREVIEW_SECRET?.trim()
  return s || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Preview: ${slug}`,
    robots: { index: false, follow: false },
  }
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const secret = previewSecret()
  const sp = searchParams ? await searchParams : undefined
  const provided = firstQueryParam(sp, 'secret') ?? ''
  if (!secret || provided !== secret) {
    notFound()
  }

  const { slug } = await params
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()

  const page = await getPreviewPageBySlug(cms.db, slug)
  if (!page) notFound()

  const locale = normalizePublicLocale(firstQueryParam(sp, 'lang'))
  const cookieStore = await cookies()
  const merged = await resolvePageForPublicView(cms.db, page, {
    cookieStore,
    queryVariant: firstQueryParam(sp, 'tma_variant'),
    queryLang: locale,
  })

  const embedShortcodeVars = await getPublicShortcodeVars()

  return (
    <div className="tma-preview-wrap">
      <aside
        className="tma-preview-banner"
        role="status"
        aria-live="polite"
      >
        Draft / preview mode — this URL is not indexed. Matches public{' '}
        <code>PageView</code> + merges (A/B, lang). Requires{' '}
        <code>INTERNAL_PREVIEW_SECRET</code>.
      </aside>
      <PageLivePreview
        page={serializePageForClient(merged)}
        embedShortcodeVars={embedShortcodeVars}
        locale={locale}
        trackingConsentGranted={false}
      />
    </div>
  )
}
