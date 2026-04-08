import { logEvent } from '@/lib/logger'
import type { EmailTemplate, Lead } from '@/types/cms'

import type { CmsDb } from './cmsData'
import {
  sendEmail,
  sendEmailByTemplateId,
} from './email/service'
import { normalizeEmailLanguage } from './email/templateVariables'

type SendEmailResult = Awaited<ReturnType<typeof sendEmail>>

export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

function relationName(
  value: Lead['serviceInterest'] | Lead['industry'],
): string {
  if (!value) return ''
  if (typeof value === 'number') return String(value)
  return value.name ?? ''
}

export function leadToTemplateVars(
  lead: Lead,
  extras?: Record<string, string>,
): Record<string, string> {
  const firstName = lead.firstName ?? ''
  const lastName = lead.lastName ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  const service =
    extras?.service ??
    extras?.serviceInterest ??
    relationName(lead.serviceInterest)
  const industry =
    extras?.industry ??
    relationName(lead.industry)

  return {
    firstName,
    lastName,
    name,
    email: lead.email,
    phone: lead.phone ?? '',
    company: lead.company ?? '',
    website: lead.website ?? '',
    formType: lead.formType ?? '',
    sourcePageSlug: lead.sourcePageSlug ?? '',
    source_page: lead.sourcePageSlug ?? '',
    service: service ?? '',
    industry: industry ?? '',
    message: extras?.message ?? '',
    ...extras,
  }
}

async function sendFromTemplateRef(params: {
  db: CmsDb
  lead: Lead
  template: EmailTemplate
  language?: string | null
  extras?: Record<string, string>
}): Promise<SendEmailResult | 'skipped'> {
  const { db, lead, template, language, extras } = params
  if (!lead.email) return 'skipped'
  const variables = leadToTemplateVars(lead, extras)
  if (typeof template.id === 'number') {
    return sendEmailByTemplateId({
      db,
      templateId: template.id,
      to: lead.email,
      language,
      variables,
    })
  }

  const key = template.key || template.slug
  if (!key) return 'skipped'
  return sendEmail({
    db,
    templateKey: key,
    to: lead.email,
    language,
    variables,
  })
}

export function formatBookingDateForEmail(d: Date, timeZone?: string): string {
  const tz = timeZone || process.env.TZ || 'UTC'
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: tz,
    }).format(d)
  } catch {
    return d.toISOString()
  }
}

export async function sendBookingConfirmationToLead(
  db: CmsDb,
  lead: Lead,
  template: EmailTemplate,
  booking: {
    scheduledFor: Date
    bookingProfileName: string
    durationMinutes: number
    slotEnd: Date
  },
  language?: string | null,
): Promise<'sent' | 'failed' | 'skipped'> {
  const result = await sendFromTemplateRef({
    db,
    lead,
    template,
    language,
    extras: {
      scheduledFor: formatBookingDateForEmail(booking.scheduledFor),
      slotEnd: formatBookingDateForEmail(booking.slotEnd),
      bookingProfileName: booking.bookingProfileName,
      durationMinutes: String(booking.durationMinutes),
    },
  })
  return result === 'skipped' ? 'skipped' : result.status
}

export async function sendTemplatedToLead(
  db: CmsDb,
  lead: Lead,
  template: EmailTemplate,
  extras?: Record<string, string>,
  language?: string | null,
): Promise<'sent' | 'failed' | 'skipped'> {
  const result = await sendFromTemplateRef({
    db,
    lead,
    template,
    extras,
    language,
  })
  return result === 'skipped' ? 'skipped' : result.status
}

export async function notifyInternalNewLead(
  db: CmsDb,
  lead: Lead,
  extraRecipients: string[],
  correlationId: string,
  language?: string | null,
  extras?: Record<string, string>,
): Promise<void> {
  const envList = (process.env.INTERNAL_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const recipients = [...new Set([...envList, ...extraRecipients])]
  if (recipients.length === 0) return

  const variables = {
    ...leadToTemplateVars(lead, extras),
    correlationId,
  }

  await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({
        db,
        templateKey: 'lead_admin_notification',
        to,
        language: normalizeEmailLanguage(language),
        variables,
      }),
    ),
  )

  logEvent({
    event: 'lead_admin_email_triggered',
    leadId: lead.id,
    correlationId,
    recipients: recipients.length,
  })
}
