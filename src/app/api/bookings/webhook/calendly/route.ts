/**
 * Optional: only used when you use Calendly as the booking provider on a profile.
 * Custom (built-in) bookings use POST /api/bookings/confirm instead — no Calendly webhook.
 */
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { cmsBookingEvents, cmsLeads } from '@/db/schema'
import { findLatestLeadIdByEmailInsensitive, tryGetCmsDb } from '@/lib/cmsData'
import { verifyCalendlySignature } from '@/lib/calendlyWebhook'
import { logEvent } from '@/lib/logger'

type CalendlyInviteeObject = {
  email?: string
  uri?: string
}

type CalendlyScheduledEventObject = {
  start_time?: string
  uri?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function parseInvitee(invitee: unknown): {
  email?: string
  uri?: string
} {
  if (typeof invitee === 'string') {
    return { uri: invitee }
  }
  const o = asRecord(invitee) as CalendlyInviteeObject | null
  if (!o) return {}
  return {
    email: typeof o.email === 'string' ? o.email : undefined,
    uri: typeof o.uri === 'string' ? o.uri : undefined,
  }
}

function parseScheduledEvent(
  scheduled: unknown,
): { start_time?: string; uri?: string } {
  const o = asRecord(scheduled) as CalendlyScheduledEventObject | null
  if (!o) return {}
  return {
    start_time: typeof o.start_time === 'string' ? o.start_time : undefined,
    uri: typeof o.uri === 'string' ? o.uri : undefined,
  }
}

function extractWebhookFields(body: Record<string, unknown>): {
  eventType: string
  inviteeEmail?: string
  scheduledFor?: string
  providerEventId: string
} | null {
  const eventType = typeof body.event === 'string' ? body.event : ''
  const payload = asRecord(body.payload)
  if (!payload) return null

  const invitee = parseInvitee(payload.invitee)
  const scheduledEvent = parseScheduledEvent(payload.scheduled_event)
  const eventResource = parseScheduledEvent(payload.event)

  const eventUri =
    typeof payload.event === 'string' ? payload.event : eventResource.uri

  const providerEventId = invitee.uri ?? scheduledEvent.uri ?? eventUri ?? ''
  if (!providerEventId) return null

  const scheduledFor =
    scheduledEvent.start_time ?? eventResource.start_time

  return {
    eventType,
    inviteeEmail: invitee.email,
    scheduledFor,
    providerEventId,
  }
}

export async function POST(request: Request) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!signingKey) {
    return NextResponse.json(
      { error: 'Webhook signing is not configured' },
      { status: 503 },
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sig = request.headers.get('Calendly-Webhook-Signature')
  if (!verifyCalendlySignature(rawBody, sig, signingKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody) as unknown
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const body = asRecord(parsed)
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const extracted = extractWebhookFields(body)
  if (!extracted) {
    return NextResponse.json({ error: 'Missing provider event id' }, { status: 422 })
  }

  const { eventType, inviteeEmail, scheduledFor, providerEventId } = extracted

  const isCreated = eventType === 'invitee.created'
  const isCanceled =
    eventType === 'invitee.canceled' || eventType === 'invitee.cancelled'

  if (!isCreated && !isCanceled) {
    return NextResponse.json({ ok: true })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  let leadId: number | null = null
  if (inviteeEmail) {
    leadId = await findLatestLeadIdByEmailInsensitive(db, inviteeEmail)
  }

  const bookingStatus: 'confirmed' | 'cancelled' = isCreated
    ? 'confirmed'
    : 'cancelled'
  const leadBookingStatus: 'scheduled' | 'cancelled' = isCreated
    ? 'scheduled'
    : 'cancelled'

  const scheduledForDate =
    scheduledFor && !Number.isNaN(Date.parse(scheduledFor))
      ? new Date(scheduledFor)
      : undefined

  const existing = await db
    .select({ id: cmsBookingEvents.id })
    .from(cmsBookingEvents)
    .where(eq(cmsBookingEvents.providerEventId, providerEventId))
    .limit(1)

  const now = new Date()
  if (existing[0]) {
    await db
      .update(cmsBookingEvents)
      .set({
        status: bookingStatus,
        scheduledFor: scheduledForDate ?? null,
        rawPayload: parsed as Record<string, unknown>,
        leadId: leadId ?? undefined,
        updatedAt: now,
      })
      .where(eq(cmsBookingEvents.id, existing[0].id))
  } else {
    await db.insert(cmsBookingEvents).values({
      leadId,
      bookingProfileId: null,
      providerEventId,
      status: bookingStatus,
      scheduledFor: scheduledForDate ?? null,
      rawPayload: parsed as Record<string, unknown>,
      updatedAt: now,
    })
  }

  if (leadId != null) {
    await db
      .update(cmsLeads)
      .set({ bookingStatus: leadBookingStatus, updatedAt: now })
      .where(eq(cmsLeads.id, leadId))
  }

  logEvent({
    event: 'calendly_webhook',
    eventType,
    leadId,
    providerEventId,
  })

  return NextResponse.json({ ok: true })
}
