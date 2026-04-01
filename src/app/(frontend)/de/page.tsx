import type { Metadata } from 'next'

import { generateLocalizedHomeMetadata, renderLocalizedHome } from '@/lib/localizedPublicRoutes'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: Props): Promise<Metadata> {
  return generateLocalizedHomeMetadata('de', props.searchParams)
}

export default async function GermanHomePage(props: Props) {
  return renderLocalizedHome('de', props.searchParams)
}
