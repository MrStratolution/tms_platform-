import { createHash, randomUUID } from 'crypto'

import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsLeads, cmsPages } from '@/db/schema'
import { captchaRequiredFromEnv, verifyCaptchaIfConfigured } from '@/lib/captcha'
import {
  findLeadByIdempotencyKey,
  getActiveFormConfigByType,
  getEmailTemplateById,
  getIndustryIdBySlug,
  getServiceIdBySlug,
  tryGetCmsDb,
  type CmsDb,
} from '@/lib/cmsData'
import { fetchLeadById } from '@/lib/cmsLeadMap'
import { notifyInternalNewLead, sendTemplatedToLead } from '@/lib/emailSend'
import {
  parseFormFieldDefinitions,
  partitionLeadFields,
  validateRequiredFields,
} from '@/lib/formFields'
import { logEvent } from '@/lib/logger'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rateLimit'
import { triggerZohoAutoSync } from '@/lib/zohoSyncJob'
import type { EmailTemplate, FormConfig } from '@/types/cms'

const bodySchema = z.object({
  formType: z.string().min(1),
  sourcePageSlug: z.string().optional(),
  lead: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional(),
    website: z.string().max(2048).optional(),
  }),
  context: z
    .object({
      serviceInterestSlug: z.string().optional(),
      industrySlug: z.string().optional(),
      utm: z.record(z.string()).optional(),
    })
    .optional(),
  consentMarketing: z.boolean().optional(),
  turnstileToken: z.string().optional(),
  hcaptchaToken: z.string().optional(),
  extras: z.record(z.string()).optional(),
})

function buildIdempotencyKey(
  email: string,
  formType: string,
  pageSlug?: string,
): string {
  const raw = `${email.toLowerCase()}|${formType}|${pageSlug ?? ''}`
  return createHash('sha256').update(raw).digest('hex')
}

function readNotifyEmails(dest: unknown): string[] {
  if (!dest || typeof dest !== 'object') return []
  const n = (dest as { notifyEmails?: unknown }).notifyEmails
  if (!Array.isArray(n)) return []
  return n.filter((x): x is string => typeof x === 'string' && x.includes('@'))
}

function captchaRequiredByForm(spam: unknown): boolean {
  if (!spam || typeof spam !== 'object') return false
  return Boolean((spam as { requireCaptcha?: boolean }).requireCaptcha)
}

async function resolveAutoresponderTemplate(
  db: CmsDb,
  formConfig: FormConfig,
): Promise<EmailTemplate | null> {
  const tpl = formConfig.autoresponderTemplate
  if (tpl == null) return null
  if (typeof tpl === 'object' && 'subject' in tpl && 'body' in tpl) {
    return tpl as EmailTemplate
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

  const ip = clientIpFromRequest(request)
  const limit = await checkRateLimit(`form:${ip}`)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many submissions. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSec ?? 60),
        },
      },
    )
  }

  const body = parsed.data

  const formConfig = await getActiveFormConfigByType(db, body.formType)
  if (!formConfig) {
    return NextResponse.json({ error: 'Unknown or inactive form type' }, { status: 400 })
  }

  const fieldDefs = parseFormFieldDefinitions(formConfig.fields)
  const flat: Record<string, string> = {
    firstName: body.lead.firstName ?? '',
    lastName: body.lead.lastName ?? '',
    email: body.lead.email,
    phone: body.lead.phone ?? '',
    company: body.lead.company ?? '',
    website: body.lead.website ?? '',
    ...Object.fromEntries(
      Object.entries(body.extras ?? {}).map(([k, v]) => [k, v ?? '']),
    ),
  }

  if (fieldDefs?.length) {
    const missing = validateRequiredFields(fieldDefs, flat)
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 422 })
    }
  }

  const needCaptcha =
    captchaRequiredFromEnv() || captchaRequiredByForm(formConfig.spamProtection)
  if (needCaptcha) {
    const cap = await verifyCaptchaIfConfigured(
      {
        turnstileToken: body.turnstileToken,
        hcaptchaToken: body.hcaptchaToken,
      },
      ip,
    )
    if (!cap.ok) {
      return NextResponse.json({ error: cap.error }, { status: 400 })
    }
  }

  let sourcePageId: number | undefined
  if (body.sourcePageSlug) {
    const pageRes = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.slug, body.sourcePageSlug),
          eq(cmsPages.status, 'published'),
        ),
      )
      .limit(1)
    sourcePageId = pageRes[0]?.id
  }

  let serviceInterestId: number | undefined
  if (body.context?.serviceInterestSlug) {
    serviceInterestId = await getServiceIdBySlug(
      db,
      body.context.serviceInterestSlug,
    )
  }

  let industryId: number | undefined
  if (body.context?.industrySlug) {
    industryId = await getIndustryIdBySlug(db, body.context.industrySlug)
  }

  const idempotencyKey = buildIdempotencyKey(
    body.lead.email,
    body.formType,
    body.sourcePageSlug,
  )

  const existing = await findLeadByIdempotencyKey(db, idempotencyKey)
  if (existing) {
    const correlationId = randomUUID()
    logEvent({
      event: 'lead_duplicate',
      leadId: existing.id,
      correlationId,
      formType: body.formType,
    })
    return NextResponse.json(
      {
        ok: true,
        duplicate: true,
        leadId: existing.id,
        correlationId,
      },
      { status: 200 },
    )
  }

  const correlationId = randomUUID()
  const { lead: partLead, extras } = partitionLeadFields(flat)

  const [created] = await db
    .insert(cmsLeads)
    .values({
      firstName: partLead.firstName || body.lead.firstName,
      lastName: partLead.lastName || body.lead.lastName,
      email: partLead.email || body.lead.email,
      phone: partLead.phone || body.lead.phone,
      company: partLead.company || body.lead.company,
      website: partLead.website || body.lead.website || undefined,
      sourcePageId: sourcePageId ?? null,
      sourcePageSlug: body.sourcePageSlug,
      utm: body.context?.utm,
      formType: body.formType,
      serviceInterestId: serviceInterestId ?? null,
      industryId: industryId ?? null,
      consentMarketing: body.consentMarketing ?? false,
      idempotencyKey,
      submissionExtras: Object.keys(extras).length ? extras : undefined,
    })
    .returning({ id: cmsLeads.id })

  const leadId = created!.id
  const lead = await fetchLeadById(db, leadId)
  if (!lead) {
    return NextResponse.json({ error: 'Lead persist failed' }, { status: 500 })
  }

  logEvent({
    event: 'lead_created',
    leadId: lead.id,
    correlationId,
    formType: body.formType,
    ip,
  })

  const notifyList = readNotifyEmails(formConfig.destination)
  await notifyInternalNewLead(db, lead, notifyList, correlationId)

  const tpl = await resolveAutoresponderTemplate(db, formConfig)
  if (tpl) {
    await sendTemplatedToLead(db, lead, tpl, extras)
  }

  triggerZohoAutoSync(lead.id, correlationId)

  return NextResponse.json(
    { ok: true, leadId: lead.id, correlationId },
    { status: 201 },
  )
}
