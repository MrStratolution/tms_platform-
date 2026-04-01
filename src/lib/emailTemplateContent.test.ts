import { describe, expect, it } from 'vitest'

import {
  decodeStructuredEmailBody,
  defaultStructuredEmailDocument,
  encodeStructuredEmailBody,
  renderEmailBodyForSend,
  renderStructuredEmailHtml,
} from '@/lib/emailTemplateContent'

describe('emailTemplateContent', () => {
  it('round-trips structured email documents through stored body content', () => {
    const doc = defaultStructuredEmailDocument('booking_confirmation')
    doc.preheader = 'Booking confirmed'
    doc.ctaLabel = 'Open calendar'
    doc.ctaUrl = 'https://example.com/calendar'

    const stored = encodeStructuredEmailBody(doc)
    const decoded = decodeStructuredEmailBody(stored)

    expect(decoded.usesEmbeddedDocument).toBe(true)
    expect(decoded.document.useCase).toBe('booking_confirmation')
    expect(decoded.document.preheader).toBe('Booking confirmed')
    expect(decoded.document.ctaUrl).toBe('https://example.com/calendar')
  })

  it('falls back cleanly for legacy html-only bodies', () => {
    const decoded = decodeStructuredEmailBody('<p>Hello <strong>{{firstName}}</strong></p>')

    expect(decoded.usesEmbeddedDocument).toBe(false)
    expect(decoded.document.htmlOverride).toContain('{{firstName}}')
  })

  it('renders send-ready html with token interpolation', () => {
    const doc = defaultStructuredEmailDocument('lead_thank_you')
    const stored = encodeStructuredEmailBody(doc)

    const html = renderEmailBodyForSend(stored, (template) =>
      template.replaceAll('{{firstName}}', 'Alex'),
    )

    expect(renderStructuredEmailHtml(doc)).toContain('{{firstName}}')
    expect(html).toContain('Alex')
    expect(html).not.toContain('{{firstName}}')
  })
})
