import type { Metadata } from 'next'

import { generateLocalizedCaseStudyMetadata, renderLocalizedCaseStudy } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateLocalizedCaseStudyMetadata('de', slug)
}

export default async function GermanCaseStudyPage({ params }: Props) {
  const { slug } = await params
  return renderLocalizedCaseStudy('de', slug)
}
