import { z } from 'zod'

import { postOpenAiCompatibleChatCompletions } from '@/lib/aiChatClient'

export const leadCopilotResultSchema = z.object({
  summary: z.string().min(1),
  fit: z.enum(['high', 'medium', 'low']),
  urgency: z.enum(['high', 'medium', 'low']),
  recommendedNextStep: z.string().min(1),
  followUpChecklist: z.array(z.string().min(1)).min(2).max(4),
  whatsAppDraft: z.string().min(1),
  emailDraft: z.string().optional(),
  reasoning: z.string().min(1),
  warnings: z.array(z.string().min(1)).optional(),
  bestContactChannel: z.enum(['whatsapp', 'email', 'phone']).optional(),
  missingInfo: z.array(z.string().min(1)).optional(),
  replyGoal: z.string().min(1).optional(),
})

export type LeadCopilotResult = z.infer<typeof leadCopilotResultSchema>

export type LeadCopilotLocale = 'de' | 'en'

export type LeadCopilotContext = {
  lead: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
    company: string | null
    website: string | null
    formType: string | null
    sourcePageSlug: string | null
    leadStatus: string
    bookingStatus: string
    owner: string | null
    notes: string | null
    utm: unknown
    submissionExtras: unknown
  }
  booking: {
    id: number
    status: string
    scheduledFor: string | null
    profileName: string | null
  } | null
  serviceName: string | null
  industryName: string | null
  sourcePage: {
    id: number
    title: string
    slug: string
    pageType: string
    status: string
  } | null
  locale: LeadCopilotLocale
}

type LeadCopilotStubResultOptions = {
  locale: LeadCopilotLocale
  leadName: string
  company: string | null
  hasPhone: boolean
  hasWebsite: boolean
  hasUpcomingBooking: boolean
  leadStatus: string
  bookingStatus: string
  serviceName: string | null
  industryName: string | null
}

const SYSTEM_RULES = `You are an internal lead-ops copilot for The Modesty Argument (TMA), a premium creative-tech studio.
Rules:
- Be concise, practical, and operational.
- Do not sound like a chatbot or a marketing assistant.
- Summaries are for admins only, not for the lead.
- Prefer one concrete next step over vague suggestions.
- If locale is "de", write all user-facing strings in professional German.
- If locale is "en", write in English.
- Mention risks only when actionable.
- WhatsApp drafts must be short, polite, and realistic for a human to send manually.
- Output MUST be a single JSON object only, no markdown, matching the schema described in the user message.`

function cleanRecord(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => {
      if (v == null) return false
      if (typeof v === 'string') return v.trim() !== ''
      if (Array.isArray(v)) return v.length > 0
      if (typeof v === 'object') return Object.keys(v).length > 0
      return true
    }),
  )
  return Object.keys(out).length ? out : undefined
}

export function inferLeadCopilotLocale(input: {
  submissionExtras?: unknown
  utm?: unknown
  sourcePageSlug?: string | null
}): LeadCopilotLocale {
  const extras = input.submissionExtras as Record<string, unknown> | null
  const utm = input.utm as Record<string, unknown> | null
  const candidates = [
    extras?._tmaLanguage,
    extras?.language,
    extras?.locale,
    utm?.language,
    utm?.lang,
    utm?.locale,
    input.sourcePageSlug,
  ]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim().toLowerCase()
    if (normalized.startsWith('en')) return 'en'
  }
  return 'de'
}

export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d]/g, '')
  return digits.length >= 7 ? digits : null
}

export function buildWhatsAppHref(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizePhoneForWhatsApp(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export function buildLeadCopilotSuggestedNote(result: LeadCopilotResult): string {
  const bullets = result.followUpChecklist.map((item) => `- ${item}`).join('\n')
  const warnings =
    result.warnings && result.warnings.length ? `\nWarnings:\n- ${result.warnings.join('\n- ')}` : ''
  const missing =
    result.missingInfo && result.missingInfo.length
      ? `\nMissing info:\n- ${result.missingInfo.join('\n- ')}`
      : ''
  return [
    `[AI lead copilot] ${result.summary}`,
    `Fit: ${result.fit} · Urgency: ${result.urgency}`,
    `Next step: ${result.recommendedNextStep}`,
    `Checklist:\n${bullets}`,
    warnings,
    missing,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildLeadCopilotAdminWhatsAppSummary(input: {
  result: LeadCopilotResult
  leadLabel: string
  locale: LeadCopilotLocale
}): string {
  const { result, leadLabel, locale } = input
  const lines =
    locale === 'en'
      ? [
          `Lead update: ${leadLabel}`,
          `Summary: ${result.summary}`,
          `Fit: ${result.fit} · Urgency: ${result.urgency}`,
          `Next step: ${result.recommendedNextStep}`,
        ]
      : [
          `Lead-Update: ${leadLabel}`,
          `Zusammenfassung: ${result.summary}`,
          `Fit: ${result.fit} · Dringlichkeit: ${result.urgency}`,
          `Nächster Schritt: ${result.recommendedNextStep}`,
        ]

  if (result.replyGoal) {
    lines.push(locale === 'en' ? `Reply goal: ${result.replyGoal}` : `Antwortziel: ${result.replyGoal}`)
  }

  return lines.join('\n')
}

function buildUserPrompt(context: LeadCopilotContext): string {
  const safeContext = {
    locale: context.locale,
    lead: {
      id: context.lead.id,
      name: [context.lead.firstName, context.lead.lastName].filter(Boolean).join(' ').trim() || null,
      email: context.lead.email,
      phone: context.lead.phone,
      company: context.lead.company,
      website: context.lead.website,
      formType: context.lead.formType,
      leadStatus: context.lead.leadStatus,
      bookingStatus: context.lead.bookingStatus,
      owner: context.lead.owner,
      notes: context.lead.notes,
      sourcePageSlug: context.lead.sourcePageSlug,
      serviceName: context.serviceName,
      industryName: context.industryName,
    },
    booking: context.booking,
    sourcePage: context.sourcePage,
    utm: cleanRecord(context.lead.utm),
    submissionExtras: cleanRecord(context.lead.submissionExtras),
  }

  return `Lead context:
${JSON.stringify(safeContext, null, 2)}

Return JSON with exactly this shape:
{
  "summary": string,
  "fit": "high" | "medium" | "low",
  "urgency": "high" | "medium" | "low",
  "recommendedNextStep": string,
  "followUpChecklist": [string, string, string? , string?],
  "whatsAppDraft": string,
  "emailDraft": string?,
  "reasoning": string,
  "warnings": [string, ...]?,
  "bestContactChannel": "whatsapp" | "email" | "phone"?,
  "missingInfo": [string, ...]?,
  "replyGoal": string?
}`
}

function buildLeadCopilotStubResult(options: LeadCopilotStubResultOptions): LeadCopilotResult {
  const contactName = options.leadName || (options.locale === 'en' ? 'there' : 'Ihnen')
  const summaryLead =
    options.company || options.serviceName || options.industryName || (options.locale === 'en' ? 'new inquiry' : 'neue Anfrage')
  const fit =
    options.hasUpcomingBooking || options.leadStatus === 'qualified'
      ? 'high'
      : options.company || options.serviceName
        ? 'medium'
        : 'low'
  const urgency =
    options.hasUpcomingBooking
      ? 'high'
      : options.leadStatus === 'qualified' || options.bookingStatus === 'scheduled'
        ? 'medium'
        : 'low'

  const warnings: string[] = []
  const missingInfo: string[] = []

  if (!options.hasPhone) {
    warnings.push(options.locale === 'en' ? 'No phone number on the lead.' : 'Keine Telefonnummer im Lead.')
    missingInfo.push(options.locale === 'en' ? 'Direct phone or WhatsApp number' : 'Direkte Telefon- oder WhatsApp-Nummer')
  }
  if (!options.company) {
    missingInfo.push(options.locale === 'en' ? 'Company or project context' : 'Firma oder Projektkontext')
  }
  if (!options.hasWebsite) {
    missingInfo.push(options.locale === 'en' ? 'Website or product URL' : 'Website oder Produkt-URL')
  }

  if (options.locale === 'en') {
    return {
      summary: `${summaryLead} lead needs a focused follow-up and clearer qualification.`,
      fit,
      urgency,
      recommendedNextStep: options.hasUpcomingBooking
        ? 'Confirm the booking scope and decision-makers before the call.'
        : 'Send a short follow-up that clarifies scope, timeline, and commercial intent.',
      followUpChecklist: [
        'Confirm the main problem and desired outcome.',
        'Check timeline and urgency.',
        'Identify budget range or buying authority.',
        options.serviceName ? `Reference the ${options.serviceName} angle.` : 'Keep the message short and concrete.',
      ].slice(0, 4),
      whatsAppDraft: `Hi ${contactName}, thanks again for reaching out to TMA. I wanted to follow up briefly and confirm your current scope, timeline, and the main outcome you need from the project. If useful, I can also suggest the most relevant next step from our side.`,
      emailDraft: `Hi ${contactName},\n\nThanks again for your inquiry. Before we suggest the next step, it would help to confirm scope, timing, and the main business outcome you want to achieve.\n\nBest,\nTMA`,
      reasoning: options.hasUpcomingBooking
        ? 'There is already a scheduled booking, so the next step should reduce ambiguity before the call.'
        : 'The lead has enough signal for a practical follow-up, but still needs better qualification.',
      warnings: warnings.length ? warnings : undefined,
      bestContactChannel: options.hasPhone ? 'whatsapp' : 'email',
      missingInfo: missingInfo.length ? missingInfo : undefined,
      replyGoal: options.hasUpcomingBooking ? 'confirm booking scope' : 'clarify scope and timeline',
    }
  }

  return {
    summary: `${summaryLead} braucht eine kurze, klar qualifizierende Nachverfolgung.`,
    fit,
    urgency,
    recommendedNextStep: options.hasUpcomingBooking
      ? 'Vor dem Termin kurz Scope, Stakeholder und Erwartung an das Gespräch bestätigen.'
      : 'Eine kurze Rückfrage senden, die Scope, Zeitrahmen und Zielbild konkretisiert.',
    followUpChecklist: [
      'Hauptproblem und gewünschtes Ergebnis bestätigen.',
      'Zeitrahmen und Dringlichkeit klären.',
      'Budgetrahmen oder Entscheidungshoheit einordnen.',
      options.serviceName
        ? `Den Bezug zu ${options.serviceName} konkret machen.`
        : 'Nachricht kurz und konkret halten.',
    ].slice(0, 4),
    whatsAppDraft: `Hallo ${contactName}, danke noch einmal für Ihre Anfrage bei TMA. Ich wollte kurz nachfassen und Scope, Zeitrahmen und das wichtigste Ziel Ihres Vorhabens besser einordnen. Wenn Sie möchten, schlage ich Ihnen im nächsten Schritt direkt das sinnvollste Vorgehen vor.`,
    emailDraft: `Hallo ${contactName},\n\nvielen Dank für Ihre Anfrage. Bevor wir den nächsten sinnvollen Schritt empfehlen, wäre es hilfreich, Scope, Zeitrahmen und das wichtigste Ziel kurz zu bestätigen.\n\nBeste Grüße\nTMA`,
    reasoning: options.hasUpcomingBooking
      ? 'Es gibt bereits eine Buchung. Der nächste Schritt sollte vor dem Termin offene Punkte reduzieren.'
      : 'Der Lead ist relevant, braucht aber noch eine saubere Einordnung von Scope und Timing.',
    warnings: warnings.length ? warnings : undefined,
    bestContactChannel: options.hasPhone ? 'whatsapp' : 'email',
    missingInfo: missingInfo.length ? missingInfo : undefined,
    replyGoal: options.hasUpcomingBooking ? 'Gespräch vorbereiten' : 'Scope und Timing klären',
  }
}

export function isLeadCopilotStubEnabled(): boolean {
  return process.env.TMA_AI_COPILOT_STUB?.trim() === '1'
}

export async function generateLeadCopilotResult(
  context: LeadCopilotContext,
): Promise<LeadCopilotResult> {
  if (isLeadCopilotStubEnabled()) {
    return buildLeadCopilotStubResult({
      locale: context.locale,
      leadName:
        [context.lead.firstName, context.lead.lastName].filter(Boolean).join(' ').trim() ||
        context.lead.email,
      company: context.lead.company,
      hasPhone: Boolean(normalizePhoneForWhatsApp(context.lead.phone)),
      hasWebsite: Boolean(context.lead.website?.trim()),
      hasUpcomingBooking:
        Boolean(context.booking?.scheduledFor) &&
        (context.booking?.status === 'confirmed' || context.lead.bookingStatus === 'scheduled'),
      leadStatus: context.lead.leadStatus,
      bookingStatus: context.lead.bookingStatus,
      serviceName: context.serviceName,
      industryName: context.industryName,
    })
  }

  const res = await postOpenAiCompatibleChatCompletions({
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_RULES },
      { role: 'user', content: buildUserPrompt(context) },
    ],
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`AI provider error ${res.status}: ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error('Empty response from AI')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI returned non-JSON')
  }

  const out = leadCopilotResultSchema.safeParse(parsed)
  if (!out.success) {
    throw new Error(`Invalid AI JSON: ${out.error.message}`)
  }
  return out.data
}
