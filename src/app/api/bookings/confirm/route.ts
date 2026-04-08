import { createHash, randomUUID } from 'crypto'

import { and, eq, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsBookingEvents, cmsLeads, cmsPages } from '@/db/schema'
import { getBookingProfileByPublicKey } from '@/lib/bookingProfile'
import {
  findLeadByIdempotencyKey,
  getEmailTemplateById,
  tryGetCmsDb,
  type CmsDb,
} from '@/lib/cmsData'
import { fetchLeadById } from '@/lib/cmsLeadMap'
import {
  formatBookingDateForEmail,
  notifyInternalNewLead,
  sendBookingConfirmationToLead,
} from '@/lib/emailSend'
import { logEvent } from '@/lib/logger'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rateLimit'
import { getPublicSiteSettingsDocument } from '@/lib/siteSettings'
import { triggerZohoAutoSync } from '@/lib/zohoSyncJob'
import type { EmailTemplate } from '@/types/cms'

const bodySchema = z.object({
  bookingProfileKey: z.string().min(1),
  language: z.string().optional(),
  scheduledFor: z.string().min(1),
  lead: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
  }),
  sourcePageSlug: z.string().optional(),
})

function idempotencyKey(email: string, profileId: number, scheduledFor: string): string {
  const raw = `${email.toLowerCase()}|booking|${profileId}|${scheduledFor}`
  return createHash('sha256').update(raw).digest('hex')
}

async function resolveConfirmationTemplate(
  db: CmsDb,
  profile: { confirmationEmailTemplate?: unknown },
): Promise<EmailTemplate | null> {
  const tpl = profile.confirmationEmailTemplate
  if (tpl == null) return null
  if (typeof tpl === 'object' && tpl !== null) {
    if ('subject' in tpl && 'body' in tpl) {
      return tpl as EmailTemplate
    }
    if ('key' in tpl || 'slug' in tpl) {
      return tpl as EmailTemplate
    }
  }
  if (typeof tpl === 'number') {
    return getEmailTemplateById(db, tpl)
  }
  return null
}

export async function POST(request: Request) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const ip = clientIpFromRequest(request)
  const limit = await checkRateLimit(`booking:${ip}`)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSec ?? 60) },
      },
    )
  }

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

  const scheduled = new Date(parsed.data.scheduledFor)
  if (Number.isNaN(scheduled.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled time' }, { status: 422 })
  }
  if (scheduled.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: 'Slot is in the past' }, { status: 422 })
  }

  const profile = await getBookingProfileByPublicKey(
    db,
    parsed.data.bookingProfileKey,
  )

  if (!profile || profile.provider !== 'internal') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const duration =
    typeof profile.durationMinutes === 'number' && profile.durationMinutes >= 15
      ? profile.durationMinutes
      : 30

  const slotEnd = new Date(scheduled.getTime() + duration * 60_000)

  const taken = await db
    .select({ id: cmsBookingEvents.id })
    .from(cmsBookingEvents)
    .where(
      and(
        eq(cmsBookingEvents.bookingProfileId, profile.id),
        ne(cmsBookingEvents.status, 'cancelled'),
        eq(cmsBookingEvents.scheduledFor, scheduled),
      ),
    )
    .limit(1)

  if (taken[0]) {
    return NextResponse.json({ error: 'This slot was just taken' }, { status: 409 })
  }

  const key = idempotencyKey(
    parsed.data.lead.email,
    profile.id,
    scheduled.toISOString(),
  )

  const existingLead = await findLeadByIdempotencyKey(db, key)
  if (existingLead) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      leadId: existingLead.id,
      bookingEventId: null,
      correlationId: randomUUID(),
    })
  }

  let sourcePageId: number | undefined
  if (parsed.data.sourcePageSlug) {
    const pageRes = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.slug, parsed.data.sourcePageSlug),
          eq(cmsPages.status, 'published'),
        ),
      )
      .limit(1)
    sourcePageId = pageRes[0]?.id
  }

  const correlationId = randomUUID()
  const providerEventId = `internal_${profile.id}_${scheduled.getTime()}`

  const [createdLead] = await db
    .insert(cmsLeads)
    .values({
      firstName: parsed.data.lead.firstName,
      lastName: parsed.data.lead.lastName,
      email: parsed.data.lead.email,
      phone: parsed.data.lead.phone,
      sourcePageId: sourcePageId ?? null,
      sourcePageSlug: parsed.data.sourcePageSlug,
      formType: 'internal_booking',
      bookingStatus: 'scheduled',
      idempotencyKey: key,
    })
    .returning({ id: cmsLeads.id })

  const leadRow = await fetchLeadById(db, createdLead!.id)
  if (!leadRow) {
    return NextResponse.json({ error: 'Lead creation failed' }, { status: 500 })
  }

  logEvent({
    event: 'booking_lead_created',
    leadId: leadRow.id,
    correlationId,
    bookingProfileId: profile.id,
    sourcePageSlug: parsed.data.sourcePageSlug ?? null,
  })

  const [event] = await db
    .insert(cmsBookingEvents)
    .values({
      leadId: leadRow.id,
      bookingProfileId: profile.id,
      providerEventId,
      scheduledFor: scheduled,
      status: 'confirmed',
      rawPayload: {
        source: 'internal_scheduler',
        slotEnd: slotEnd.toISOString(),
        correlationId,
      },
    })
    .returning({ id: cmsBookingEvents.id })

  void (async () => {
    const site = await getPublicSiteSettingsDocument(db)
    const siteEmail = site?.contactInfo?.email?.trim()
    const extras = {
      scheduledFor: formatBookingDateForEmail(scheduled),
      slotEnd: formatBookingDateForEmail(slotEnd),
      bookingProfileName: profile.name ?? '',
      durationMinutes: String(duration),
    }

    await notifyInternalNewLead(
      db,
      leadRow,
      siteEmail ? [siteEmail] : [],
      correlationId,
      parsed.data.language,
      extras,
    )

    const tpl = await resolveConfirmationTemplate(db, profile)
    if (tpl) {
      await sendBookingConfirmationToLead(
        db,
        leadRow,
        tpl,
        {
          scheduledFor: scheduled,
          bookingProfileName: profile.name ?? '',
          durationMinutes: duration,
          slotEnd,
        },
        parsed.data.language,
      )
    }
  })().catch((error) => {
    logEvent({
      event: 'booking_email_dispatch_failed',
      leadId: leadRow.id,
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown booking email dispatch failure',
    })
  })

  triggerZohoAutoSync(leadRow.id, correlationId)

  return NextResponse.json({
    ok: true,
    leadId: leadRow.id,
    bookingEventId: event!.id,
    thankYouPageSlug: profile.thankYouPageSlug ?? null,
    correlationId,
  })
}
