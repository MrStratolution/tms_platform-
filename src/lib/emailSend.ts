import { logEvent } from '@/lib/logger'
import { cmsEmailLogs } from '@/db/schema'
import type { EmailTemplate, Lead } from '@/types/cms'

import type { CmsDb } from './cmsData'
import { renderEmailBodyForSend } from './emailTemplateContent'

type SendParams = {
  db: CmsDb
  to: string
  subject: string
  html: string
  text?: string
  leadId?: number
  templateId?: number
}

/**
 * Interpolate `{{key}}` from a flat record (lead + extras).
 */
export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v == null) return ''
    return String(v)
  })
}

function interpolateTemplateRecord(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>,
): string {
  return interpolateTemplate(template, vars)
}

export function leadToTemplateVars(
  lead: Lead,
  extras?: Record<string, string>,
): Record<string, string> {
  const base: Record<string, string> = {
    firstName: lead.firstName ?? '',
    lastName: lead.lastName ?? '',
    email: lead.email,
    phone: lead.phone ?? '',
    company: lead.company ?? '',
    website: lead.website ?? '',
    formType: lead.formType ?? '',
    sourcePageSlug: lead.sourcePageSlug ?? '',
  }
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      base[k] = v
    }
  }
  return base
}

/**
 * Resend HTTP API (no extra npm dependency).
 */
export async function sendWithResend(params: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  const from = process.env.RESEND_FROM_EMAIL || 'TMA <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text ?? stripHtml(params.html),
    }),
  })
  const data = (await res.json()) as { id?: string; message?: string }
  if (!res.ok) {
    return { ok: false, error: data.message ?? res.statusText }
  }
  return { ok: true, id: data.id }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function logAndSendEmail(params: SendParams): Promise<'sent' | 'failed'> {
  const { db, to, subject, html, text, leadId, templateId } = params
  const sentAt = new Date()

  const result = await sendWithResend({ to, subject, html, text })

  if (result.ok) {
    await db.insert(cmsEmailLogs).values({
      leadId: leadId ?? null,
      templateId: templateId ?? null,
      recipient: to,
      status: 'sent',
      providerMessageId: result.id ?? null,
      sentAt,
    })
    logEvent({ event: 'email_sent', to, leadId, templateId })
    return 'sent'
  }

  await db.insert(cmsEmailLogs).values({
    leadId: leadId ?? null,
    templateId: templateId ?? null,
    recipient: to,
    status: 'failed',
    providerMessageId: null,
    sentAt,
  })
  logEvent({ event: 'email_failed', to, leadId, error: result.error })
  return 'failed'
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
): Promise<'sent' | 'failed' | 'skipped'> {
  if (!process.env.RESEND_API_KEY) return 'skipped'

  const vars = {
    ...leadToTemplateVars(lead),
    scheduledFor: formatBookingDateForEmail(booking.scheduledFor),
    slotEnd: formatBookingDateForEmail(booking.slotEnd),
    bookingProfileName: booking.bookingProfileName,
    durationMinutes: String(booking.durationMinutes),
  }
  const subject = interpolateTemplate(template.subject, vars)
  const html = renderEmailBodyForSend(template.body, (value) =>
    interpolateTemplateRecord(value, vars),
  )
  return logAndSendEmail({
    db,
    to: lead.email,
    subject,
    html,
    leadId: lead.id,
    templateId: template.id,
  })
}

export async function sendTemplatedToLead(
  db: CmsDb,
  lead: Lead,
  template: EmailTemplate,
  extras?: Record<string, string>,
): Promise<'sent' | 'failed' | 'skipped'> {
  if (!process.env.RESEND_API_KEY) return 'skipped'

  const vars = leadToTemplateVars(lead, extras)
  const subject = interpolateTemplate(template.subject, vars)
  const html = renderEmailBodyForSend(template.body, (value) =>
    interpolateTemplateRecord(value, vars),
  )
  return logAndSendEmail({
    db,
    to: lead.email,
    subject,
    html,
    leadId: lead.id,
    templateId: template.id,
  })
}

function leadSummaryHtml(lead: Lead): string {
  const rows = [
    ['Email', lead.email],
    ['Name', [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—'],
    ['Company', lead.company ?? '—'],
    ['Phone', lead.phone ?? '—'],
    ['Form', lead.formType ?? '—'],
    ['Page', lead.sourcePageSlug ?? '—'],
  ]
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;border:1px solid #eee"><strong>${k}</strong></td><td style="padding:6px 12px;border:1px solid #eee">${String(v)}</td></tr>`,
    )
    .join('')
  return `<table style="border-collapse:collapse;font-family:system-ui,sans-serif">${tr}</table>`
}

export async function notifyInternalNewLead(
  db: CmsDb,
  lead: Lead,
  extraRecipients: string[],
  correlationId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const envList = (process.env.INTERNAL_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const recipients = [...new Set([...envList, ...extraRecipients])]
  if (recipients.length === 0) return

  const subject = `New lead: ${lead.email}`
  const html = `<p>New submission (${correlationId})</p>${leadSummaryHtml(lead)}`

  await Promise.allSettled(
    recipients.map((to) =>
      logAndSendEmail({
        db,
        to,
        subject,
        html,
        leadId: lead.id,
      }),
    ),
  )
}
