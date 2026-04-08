import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CaseStudyPublicView } from '@/components/case-studies/CaseStudyPublicView'
import { getCustomDb } from '@/db/client'
import { getActiveCaseStudyBySlug } from '@/lib/cmsData'
import { isMissingDbRelationError } from '@/lib/db/errors'
import { buildCaseStudyPublicMetadata } from '@/lib/pageMetadata'
import { getPublicSiteSettingsDocument } from '@/lib/siteSettings'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const db = getCustomDb()
  if (!db) return { title: 'Work' }

  try {
    const row = await getActiveCaseStudyBySlug(db, slug)
    if (!row) return { title: 'Not found' }
    const site = await getPublicSiteSettingsDocument(db)
    const featuredImageUrl =
      row.featuredImage && typeof row.featuredImage === 'object' && 'url' in row.featuredImage
        ? row.featuredImage.url
        : null
    return buildCaseStudyPublicMetadata(
      {
        title: row.title,
        summary: row.summary,
        slug,
        featuredImageUrl,
      },
      site,
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) return { title: 'Work' }
    throw e
  }
}

export default async function PublicCaseStudyPage(props: Props) {
  const { slug } = await props.params
  const db = getCustomDb()
  if (!db) notFound()

  try {
    const row = await getActiveCaseStudyBySlug(db, slug)
    if (!row) notFound()
    return (
      <div className="tma-case-study-page">
        <CaseStudyPublicView caseStudy={row} />
      </div>
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) notFound()
    throw e
  }
}
