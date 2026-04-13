import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsBookingEvents, cmsLeads } from '@/db/schema'
import { getBookingProfileByPublicKey, internalBookPath } from '@/lib/bookingProfile'
import {
  findLatestLeadIdByEmailInsensitive,
  getActiveBookingProfileById,
  tryGetCmsDb,
} from '@/lib/cmsData'
import { fetchLeadById } from '@/lib/cmsLeadMap'
import { logEvent } from '@/lib/logger'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'

const bodySchema = z.object({
  bookingProfileId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  bookingProfileKey: z.string().min(1).optional(),
  leadId: z.number().int().positive().optional(),
  leadEmail: z.string().email().optional(),
}).refine((value) => value.bookingProfileId != null || value.bookingProfileKey != null, {
  message: 'bookingProfileId or bookingProfileKey is required',
  path: ['bookingProfileId'],
})

function coerceProfileId(raw: string | number): number | null {
  if (typeof raw === 'number') return raw
  const n = Number.parseInt(raw, 10)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export async function POST(request: Request) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const id =
    parsed.data.bookingProfileId != null ? coerceProfileId(parsed.data.bookingProfileId) : null
  if (parsed.data.bookingProfileId != null && id == null) {
    return NextResponse.json({ error: 'Invalid booking profile id' }, { status: 400 })
  }

  const profile =
    (id != null ? await getActiveBookingProfileById(db, id) : null) ??
    (parsed.data.bookingProfileKey
      ? await getBookingProfileByPublicKey(db, parsed.data.bookingProfileKey)
      : null)

  if (!profile || !profile.active) {
    return NextResponse.json({ error: 'Booking profile not found' }, { status: 404 })
  }

  const correlationId = crypto.randomUUID()
  let resolvedLeadId: number | undefined

  if (parsed.data.leadId != null) {
    const lead = await fetchLeadById(db, parsed.data.leadId)
    if (lead) resolvedLeadId = lead.id
  } else if (parsed.data.leadEmail) {
    const norm = parsed.data.leadEmail.trim().toLowerCase()
    const lid = await findLatestLeadIdByEmailInsensitive(db, norm)
    if (lid != null) resolvedLeadId = lid
  }

  if (resolvedLeadId != null) {
    await db.insert(cmsBookingEvents).values({
      leadId: resolvedLeadId,
      bookingProfileId: profile.id,
      providerEventId: `start_${profile.id}_${Date.now()}`,
      status: 'pending',
      rawPayload: {
        source: 'booking_start',
        correlationId,
        mode: profile.provider === 'internal' ? 'internal' : 'redirect',
      },
    })

    await db
      .update(cmsLeads)
      .set({ bookingStatus: 'started', updatedAt: new Date() })
      .where(eq(cmsLeads.id, resolvedLeadId))

    logEvent({
      event: 'booking_started',
      correlationId,
      leadId: resolvedLeadId,
      bookingProfileId: profile.id,
    })
  }

  const base = {
    bookingProfile: profile.id,
    provider: profile.provider,
    thankYouPageSlug: profile.thankYouPageSlug ?? null,
    tracking: profile.tracking ?? {},
    correlationId,
    provisionalEvent: resolvedLeadId != null,
  }

  if (profile.provider === 'internal') {
    const path = `/book/${internalBookPath(profile)}`
    const origin = getPublicSiteOrigin()
    return NextResponse.json({
      ...base,
      mode: 'internal',
      path,
      url: path,
      absoluteUrl: `${origin}${path}`,
    })
  }

  const url = profile.bookingUrl?.trim()
  if (!url) {
    return NextResponse.json(
      { error: 'This profile has no external booking URL configured' },
      { status: 422 },
    )
  }

  return NextResponse.json({
    ...base,
    mode: 'redirect',
    url,
  })
}
