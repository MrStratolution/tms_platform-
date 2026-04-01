import { NextResponse } from 'next/server'

import { generateSlotStartsISO } from '@/lib/bookingSlots'
import { getBookingProfileByPublicKey } from '@/lib/bookingProfile'
import { tryGetCmsDb } from '@/lib/cmsData'

const MAX_DAYS = 21

export async function GET(request: Request) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key') ?? searchParams.get('profileKey') ?? ''
  const daysRaw = searchParams.get('days')
  const days = Math.min(
    MAX_DAYS,
    Math.max(1, Number.parseInt(daysRaw ?? '14', 10) || 14),
  )

  if (!key.trim()) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  const profile = await getBookingProfileByPublicKey(db, key)

  if (!profile || profile.provider !== 'internal') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const duration =
    typeof profile.durationMinutes === 'number' && profile.durationMinutes >= 15
      ? profile.durationMinutes
      : 30

  const from = new Date()
  const to = new Date(from.getTime() + days * 24 * 60 * 60_000)

  const slots = generateSlotStartsISO({
    from,
    to,
    durationMinutes: duration,
    availability: profile.availability,
  })

  return NextResponse.json({
    bookingProfileId: profile.id,
    durationMinutes: duration,
    slots,
  })
}
