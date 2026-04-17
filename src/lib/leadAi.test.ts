import { afterEach, describe, expect, it } from 'vitest'

import {
  buildLeadCopilotAdminWhatsAppSummary,
  buildLeadCopilotSuggestedNote,
  buildWhatsAppHref,
  generateLeadCopilotResult,
  inferLeadCopilotLocale,
  normalizePhoneForWhatsApp,
  type LeadCopilotContext,
} from '@/lib/leadAi'

const baseContext: LeadCopilotContext = {
  lead: {
    id: 1,
    firstName: 'Mira',
    lastName: 'Stone',
    email: 'mira@example.com',
    phone: '+49 171 5551234',
    company: 'Atlas Neural',
    website: 'https://atlas.example.com',
    formType: 'contact',
    sourcePageSlug: 'contact',
    leadStatus: 'qualified',
    bookingStatus: 'scheduled',
    owner: null,
    notes: null,
    utm: null,
    submissionExtras: null,
  },
  booking: {
    id: 2,
    status: 'confirmed',
    scheduledFor: '2026-04-20T09:00:00.000Z',
    profileName: 'Strategy Call',
  },
  serviceName: 'Web Design',
  industryName: 'AI Platforms',
  sourcePage: {
    id: 3,
    title: 'Contact',
    slug: 'contact',
    pageType: 'page',
    status: 'published',
  },
  locale: 'de',
}

const originalStub = process.env.TMA_AI_COPILOT_STUB
const originalKey = process.env.TMA_AI_API_KEY
const originalOpenAiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  process.env.TMA_AI_COPILOT_STUB = originalStub
  process.env.TMA_AI_API_KEY = originalKey
  process.env.OPENAI_API_KEY = originalOpenAiKey
})

describe('leadAi helpers', () => {
  it('infers locale from stored lead metadata and defaults to German', () => {
    expect(
      inferLeadCopilotLocale({ submissionExtras: { _tmaLanguage: 'en' }, utm: null, sourcePageSlug: 'contact' }),
    ).toBe('en')
    expect(
      inferLeadCopilotLocale({ submissionExtras: null, utm: { lang: 'en-GB' }, sourcePageSlug: 'contact' }),
    ).toBe('en')
    expect(
      inferLeadCopilotLocale({ submissionExtras: null, utm: null, sourcePageSlug: 'kontakt' }),
    ).toBe('de')
  })

  it('normalizes WhatsApp phones and builds wa.me links', () => {
    expect(normalizePhoneForWhatsApp('+49 (171) 555-1234')).toBe('491715551234')
    expect(normalizePhoneForWhatsApp('abc')).toBeNull()
    expect(buildWhatsAppHref('+49 171 5551234', 'Hallo')).toContain('https://wa.me/491715551234?text=')
  })

  it('builds a save-ready note from the AI result', () => {
    const note = buildLeadCopilotSuggestedNote({
      summary: 'Qualified lead with clear project scope.',
      fit: 'high',
      urgency: 'medium',
      recommendedNextStep: 'Confirm budget and timeline.',
      followUpChecklist: ['Confirm budget', 'Confirm timeline'],
      whatsAppDraft: 'Hallo',
      reasoning: 'The inquiry is specific enough to qualify.',
      warnings: ['Missing decision-maker'],
      missingInfo: ['Decision-maker'],
    })
    expect(note).toContain('Qualified lead with clear project scope.')
    expect(note).toContain('Confirm budget and timeline.')
    expect(note).toContain('Missing decision-maker')
  })

  it('builds a concise admin WhatsApp summary', () => {
    const summary = buildLeadCopilotAdminWhatsAppSummary({
      leadLabel: 'Mira Stone',
      locale: 'de',
      result: {
        summary: 'Qualified lead with clear project scope.',
        fit: 'high',
        urgency: 'medium',
        recommendedNextStep: 'Confirm budget and timeline.',
        followUpChecklist: ['Confirm budget', 'Confirm timeline'],
        whatsAppDraft: 'Hallo',
        reasoning: 'The inquiry is specific enough to qualify.',
        replyGoal: 'Scope und Timing klären',
      },
    })
    expect(summary).toContain('Lead-Update: Mira Stone')
    expect(summary).toContain('Nächster Schritt: Confirm budget and timeline.')
    expect(summary).toContain('Antwortziel: Scope und Timing klären')
  })

  it('returns deterministic stub output when the copilot stub is enabled', async () => {
    process.env.TMA_AI_COPILOT_STUB = '1'
    const result = await generateLeadCopilotResult(baseContext)
    expect(result.summary.length).toBeGreaterThan(10)
    expect(result.whatsAppDraft.length).toBeGreaterThan(10)
    expect(result.fit).toBe('high')
    expect(result.bestContactChannel).toBe('whatsapp')
  })

  it('throws a missing-key error when no AI credentials exist and stub mode is off', async () => {
    delete process.env.TMA_AI_COPILOT_STUB
    delete process.env.TMA_AI_API_KEY
    delete process.env.OPENAI_API_KEY
    await expect(generateLeadCopilotResult(baseContext)).rejects.toThrow(
      /AI API key not configured/,
    )
  })
})
