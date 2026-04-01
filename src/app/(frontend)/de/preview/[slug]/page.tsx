import type { Metadata } from 'next'

import { generateLocalizedPreviewMetadata, renderLocalizedPreview } from '@/lib/localizedPublicRoutes'

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateLocalizedPreviewMetadata(slug)
}

export default async function GermanPreviewPage(props: Props) {
  const { slug } = await props.params
  return renderLocalizedPreview('de', slug, props.searchParams)
}
