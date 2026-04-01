import type { Metadata } from 'next'

import { generateLocalizedPageMetadata, renderLocalizedPage } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateLocalizedPageMetadata('en', slug)
}

export default async function EnglishPage({ params }: Props) {
  const { slug } = await params
  return renderLocalizedPage('en', slug)
}
