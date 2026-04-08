import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsBookingEvents, cmsBookingProfiles, cmsLeads } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { rowToBookingProfile } from '@/lib/cmsData'
import { fetchLeadById } from '@/lib/cmsLeadMap'
import { formatBookingDateForEmail, leadToTemplateVars } from '@/lib/emailSend'
import { sendEmail } from '@/lib/email/service'
import { logEvent } from '@/lib/logger'

const bodySchema = z.object({
  bookingEventId: z.number().int().positive(),
  reason: z.string().trim().max(1000).optional(),
})

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'leads:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const bookingRows = await db
    .select()
    .from(cmsBookingEvents)
    .where(eq(cmsBookingEvents.id, parsed.data.bookingEventId))
    .limit(1)

  const bookingEvent = bookingRows[0]
  if (!bookingEvent) {
    return NextResponse.json({ error: 'Booking event not found' }, { status: 404 })
  }

  const reason = parsed.data.reason?.trim() || null
  const existingPayload =
    bookingEvent.rawPayload && typeof bookingEvent.rawPayload === 'object' && !Array.isArray(bookingEvent.rawPayload)
      ? (bookingEvent.rawPayload as Record<string, unknown>)
      : {}

  await db
    .update(cmsBookingEvents)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
      rawPayload: {
        ...existingPayload,
        cancellation: {
          reason,
          cancelledAt: new Date().toISOString(),
          cancelledByUserId: auth.user.sub,
          cancelledByEmail: auth.user.email,
        },
      },
    })
    .where(eq(cmsBookingEvents.id, bookingEvent.id))

  if (typeof bookingEvent.leadId === 'number') {
    await db
      .update(cmsLeads)
      .set({
        bookingStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(cmsLeads.id, bookingEvent.leadId))
  }

  const lead =
    typeof bookingEvent.leadId === 'number'
      ? await fetchLeadById(db, bookingEvent.leadId)
      : null

  const bookingProfileRows =
    typeof bookingEvent.bookingProfileId === 'number'
      ? await db
          .select()
          .from(cmsBookingProfiles)
          .where(and(eq(cmsBookingProfiles.id, bookingEvent.bookingProfileId)))
          .limit(1)
      : []
  const bookingProfile = bookingProfileRows[0]
    ? rowToBookingProfile(bookingProfileRows[0])
    : null

  if (lead?.email) {
    const scheduledForLabel = bookingEvent.scheduledFor
      ? formatBookingDateForEmail(new Date(bookingEvent.scheduledFor))
      : ''

    const emailResult = await sendEmail({
      db,
      templateKey: 'booking-cancellation',
      to: lead.email,
      language: 'de',
      leadId: lead.id,
      variables: {
        ...leadToTemplateVars(lead, {
          scheduledFor: scheduledForLabel,
          bookingProfileName: bookingProfile?.name ?? '',
          reason: reason ?? '',
        }),
      },
    })

    logEvent({
      event: 'booking_cancel_email_dispatch',
      leadId: lead.id,
      bookingEventId: bookingEvent.id,
      bookingProfileId: bookingEvent.bookingProfileId,
      status: emailResult.status,
    })
  }

  logEvent({
    event: 'booking_cancelled',
    leadId: bookingEvent.leadId,
    bookingEventId: bookingEvent.id,
    bookingProfileId: bookingEvent.bookingProfileId,
    reason,
    actorUserId: auth.user.sub,
    actorEmail: auth.user.email,
  })

  return NextResponse.json({
    success: true,
    bookingEventId: bookingEvent.id,
  })
}
