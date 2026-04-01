import { notFound } from 'next/navigation'

import { InternalBookFlow } from '@/components/booking/InternalBookFlow'
import { getBookingProfileByPublicKey } from '@/lib/bookingProfile'
import { tryGetCmsDb } from '@/lib/cmsData'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props) {
  const { key } = await params
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return { title: 'Book' }
  }
  const profile = await getBookingProfileByPublicKey(
    cms.db,
    decodeURIComponent(key),
  )
  if (!profile || profile.provider !== 'internal') {
    return { title: 'Book' }
  }
  return {
    title: `Book — ${profile.name}`,
    description: `Schedule a ${profile.durationMinutes ?? 30}-minute session with ${profile.name}.`,
  }
}

export default async function BookPage({ params }: Props) {
  const { key } = await params
  const decoded = decodeURIComponent(key)
  const cms = tryGetCmsDb()
  if (!cms.ok) notFound()

  const profile = await getBookingProfileByPublicKey(cms.db, decoded)

  if (!profile || profile.provider !== 'internal') {
    notFound()
  }

  return (
    <article className="tma-page book-page">
      <header className="tma-page-title">
        <h1>{profile.name}</h1>
        {profile.assignedOwner ? (
          <p className="tma-lead">With {profile.assignedOwner}</p>
        ) : null}
      </header>
      <InternalBookFlow
        profileKey={decoded}
        profileName={profile.name}
        thankYouPageSlug={profile.thankYouPageSlug}
      />
    </article>
  )
}
