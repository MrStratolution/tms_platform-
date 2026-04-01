import type { Metadata } from 'next'

import { generateLocalizedProductMetadata, renderLocalizedProduct } from '@/lib/localizedPublicRoutes'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateLocalizedProductMetadata('en', slug)
}

export default async function EnglishProductPage({ params }: Props) {
  const { slug } = await params
  return renderLocalizedProduct('en', slug)
}
