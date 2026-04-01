import type { Metadata } from 'next'

import { generateLocalizedHomeMetadata, renderLocalizedHome } from '@/lib/localizedPublicRoutes'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: Props): Promise<Metadata> {
  return generateLocalizedHomeMetadata('en', props.searchParams)
}

export default async function EnglishHomePage(props: Props) {
  return renderLocalizedHome('en', props.searchParams)
}
