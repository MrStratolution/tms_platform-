import { desc, eq } from 'drizzle-orm'

import {
  cmsBookingEvents,
  cmsBookingProfiles,
  cmsIndustries,
  cmsLeads,
  cmsPages,
  cmsServices,
} from '@/db/schema'
import type { CmsDb } from '@/lib/cmsData'
import { inferLeadCopilotLocale, normalizePhoneForWhatsApp, type LeadCopilotContext } from '@/lib/leadAi'

function bookingProfileNameFromDocument(document: unknown): string | null {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null
  const name = (document as { name?: unknown }).name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export type LeadCopilotMeta = {
  leadLabel: string
  email: string
  phone: string | null
  whatsappPhone: string | null
  locale: 'de' | 'en'
}

export async function fetchLeadCopilotContext(
  db: CmsDb,
  leadId: number,
): Promise<{ context: LeadCopilotContext; meta: LeadCopilotMeta } | null> {
  const leadRows = await db.select().from(cmsLeads).where(eq(cmsLeads.id, leadId)).limit(1)
  const lead = leadRows[0]
  if (!lead) return null

  const [serviceRows, industryRows, pageRows, bookingRows] = await Promise.all([
    lead.serviceInterestId != null
      ? db.select().from(cmsServices).where(eq(cmsServices.id, lead.serviceInterestId)).limit(1)
      : Promise.resolve([]),
    lead.industryId != null
      ? db.select().from(cmsIndustries).where(eq(cmsIndustries.id, lead.industryId)).limit(1)
      : Promise.resolve([]),
    lead.sourcePageId != null
      ? db.select().from(cmsPages).where(eq(cmsPages.id, lead.sourcePageId)).limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(cmsBookingEvents)
      .where(eq(cmsBookingEvents.leadId, lead.id))
      .orderBy(desc(cmsBookingEvents.scheduledFor), desc(cmsBookingEvents.id))
      .limit(1),
  ])

  const bookingEvent = bookingRows[0] ?? null
  const bookingProfileRows =
    bookingEvent?.bookingProfileId != null
      ? await db
          .select({
            id: cmsBookingProfiles.id,
            document: cmsBookingProfiles.document,
          })
          .from(cmsBookingProfiles)
          .where(eq(cmsBookingProfiles.id, bookingEvent.bookingProfileId))
          .limit(1)
      : []
  const bookingProfile = bookingProfileRows[0] ?? null
  const locale = inferLeadCopilotLocale({
    submissionExtras: lead.submissionExtras,
    utm: lead.utm,
    sourcePageSlug: lead.sourcePageSlug,
  })
  const leadLabel =
    [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() ||
    lead.company?.trim() ||
    lead.email

  return {
    context: {
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        website: lead.website,
        formType: lead.formType,
        sourcePageSlug: lead.sourcePageSlug,
        leadStatus: lead.leadStatus,
        bookingStatus: lead.bookingStatus,
        owner: lead.owner,
        notes: lead.notes,
        utm: lead.utm,
        submissionExtras: lead.submissionExtras,
      },
      booking: bookingEvent
        ? {
            id: bookingEvent.id,
            status: bookingEvent.status,
            scheduledFor: bookingEvent.scheduledFor?.toISOString() ?? null,
            profileName: bookingProfileNameFromDocument(bookingProfile?.document),
          }
        : null,
      serviceName: serviceRows[0]?.name ?? null,
      industryName: industryRows[0]?.name ?? null,
      sourcePage: pageRows[0]
        ? {
            id: pageRows[0].id,
            title: pageRows[0].title,
            slug: pageRows[0].slug,
            pageType: pageRows[0].pageType,
            status: pageRows[0].status,
          }
        : null,
      locale,
    },
    meta: {
      leadLabel,
      email: lead.email,
      phone: lead.phone,
      whatsappPhone: normalizePhoneForWhatsApp(lead.phone),
      locale,
    },
  }
}
