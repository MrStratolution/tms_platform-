import { and, gte, lte, ne, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { cmsBookingEvents } from '@/db/schema'
import { generateSlotStartsISO, filterBookedSlotStartsISO } from '@/lib/bookingSlots'
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
  const availability =
    profile.availability && typeof profile.availability === 'object' && !Array.isArray(profile.availability)
      ? (profile.availability as {
          bufferBeforeMinutes?: unknown
          bufferAfterMinutes?: unknown
        })
      : undefined
  const bufferBeforeMinutes =
    typeof availability?.bufferBeforeMinutes === 'number' && availability.bufferBeforeMinutes > 0
      ? availability.bufferBeforeMinutes
      : 0
  const bufferAfterMinutes =
    typeof availability?.bufferAfterMinutes === 'number' && availability.bufferAfterMinutes > 0
      ? availability.bufferAfterMinutes
      : 0

  const from = new Date()
  const to = new Date(from.getTime() + days * 24 * 60 * 60_000)

  const slotStarts = generateSlotStartsISO({
    from,
    to,
    durationMinutes: duration,
    availability: profile.availability,
  })

  const bookingWindowMs =
    (duration + bufferBeforeMinutes + bufferAfterMinutes) * 60 * 1000
  const bookedFrom = new Date(from.getTime() - bookingWindowMs)
  const bookedTo = new Date(to.getTime() + bookingWindowMs)

  const bookedRows = await db
    .select({ scheduledFor: cmsBookingEvents.scheduledFor })
    .from(cmsBookingEvents)
    .where(
      and(
        eq(cmsBookingEvents.bookingProfileId, profile.id),
        ne(cmsBookingEvents.status, 'cancelled'),
        gte(cmsBookingEvents.scheduledFor, bookedFrom),
        lte(cmsBookingEvents.scheduledFor, bookedTo),
      ),
    )

  const slots = filterBookedSlotStartsISO({
    slotStartsIso: slotStarts,
    bookedStarts: bookedRows
      .map((row) => row.scheduledFor)
      .filter((value): value is Date => value instanceof Date),
    durationMinutes: duration,
    bufferBeforeMinutes,
    bufferAfterMinutes,
  })

  return NextResponse.json({
    bookingProfileId: profile.id,
    durationMinutes: duration,
    slots,
  })
}
