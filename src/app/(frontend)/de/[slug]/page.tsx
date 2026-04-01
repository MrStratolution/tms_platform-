import type { Metadata } from 'next'

import { generateLocalizedPageMetadata, renderLocalizedPage } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateLocalizedPageMetadata('de', slug)
}

export default async function GermanPage({ params }: Props) {
  const { slug } = await params
  return renderLocalizedPage('de', slug)
}
