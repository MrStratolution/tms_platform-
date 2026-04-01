export type EmailTemplateUseCase =
  | 'generic'
  | 'lead_thank_you'
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'internal_lead_notification'
  | 'internal_sync_alert'

export type StructuredEmailBlock = {
  id: string
  type: 'text' | 'bullets' | 'notice'
  title: string
  body: string
  items: string[]
}

export type StructuredEmailDocument = {
  version: 1
  useCase: EmailTemplateUseCase
  preheader: string
  intro: string
  blocks: StructuredEmailBlock[]
  ctaLabel: string
  ctaUrl: string
  footer: string
  htmlOverride: string
}

const MARKER_PREFIX = '<!--TMA_EMAIL_DOC:'
const MARKER_SUFFIX = '-->'

function encodeBase64(value: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64')
  }
  return window.btoa(unescape(encodeURIComponent(value)))
}

function decodeBase64(value: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8')
  }
  return decodeURIComponent(escape(window.atob(value)))
}

function newBlockId(index: number): string {
  return `block-${index + 1}`
}

export function defaultStructuredEmailDocument(
  useCase: EmailTemplateUseCase = 'generic',
): StructuredEmailDocument {
  switch (useCase) {
    case 'lead_thank_you':
      return {
        version: 1,
        useCase,
        preheader: 'We received your inquiry and will get back to you shortly.',
        intro: 'Hi {{firstName}}, thanks for reaching out. We received your inquiry and will be in touch soon.',
        blocks: [
          {
            id: newBlockId(0),
            type: 'text',
            title: 'What happens next',
            body: 'Our team reviews each inquiry carefully. If anything is time-sensitive, reply directly to this email.',
            items: [],
          },
        ],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'The TMA team',
        htmlOverride: '',
      }
    case 'booking_confirmation':
      return {
        version: 1,
        useCase,
        preheader: 'Your call has been confirmed.',
        intro: 'Hi {{firstName}}, your {{bookingProfileName}} is confirmed for {{scheduledFor}}.',
        blocks: [
          {
            id: newBlockId(0),
            type: 'bullets',
            title: 'Booking details',
            body: '',
            items: [
              'Start: {{scheduledFor}}',
              'End: {{slotEnd}}',
              'Duration: {{durationMinutes}} minutes',
            ],
          },
        ],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'If you need to reschedule, reply to this email.',
        htmlOverride: '',
      }
    case 'booking_reminder':
      return {
        version: 1,
        useCase,
        preheader: 'Reminder for your upcoming booking.',
        intro: 'A quick reminder that your {{bookingProfileName}} is scheduled for {{scheduledFor}}.',
        blocks: [],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'See you soon.',
        htmlOverride: '',
      }
    case 'internal_lead_notification':
      return {
        version: 1,
        useCase,
        preheader: 'New lead received.',
        intro: 'A new lead has been captured for review.',
        blocks: [
          {
            id: newBlockId(0),
            type: 'bullets',
            title: 'Lead snapshot',
            body: '',
            items: [
              'Name: {{firstName}} {{lastName}}',
              'Email: {{email}}',
              'Company: {{company}}',
              'Source page: {{sourcePageSlug}}',
            ],
          },
        ],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'Check the console for full context.',
        htmlOverride: '',
      }
    case 'internal_sync_alert':
      return {
        version: 1,
        useCase,
        preheader: 'A sync or automation issue needs attention.',
        intro: 'An integration or automation issue requires review.',
        blocks: [
          {
            id: newBlockId(0),
            type: 'notice',
            title: 'Operational alert',
            body: 'Review the integration logs in the admin console and retry the failed sync if appropriate.',
            items: [],
          },
        ],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'TMA Platform monitoring',
        htmlOverride: '',
      }
    case 'generic':
    default:
      return {
        version: 1,
        useCase: 'generic',
        preheader: '',
        intro: 'Hello {{firstName}},',
        blocks: [
          {
            id: newBlockId(0),
            type: 'text',
            title: '',
            body: '',
            items: [],
          },
        ],
        ctaLabel: '',
        ctaUrl: '',
        footer: 'The TMA team',
        htmlOverride: '',
      }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderTextWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br/>')
}

export function renderStructuredEmailHtml(doc: StructuredEmailDocument): string {
  const preheader = doc.preheader.trim()
  const intro = doc.intro.trim()
  const footer = doc.footer.trim()
  const ctaLabel = doc.ctaLabel.trim()
  const ctaUrl = doc.ctaUrl.trim()

  const blocks = doc.blocks
    .map((block) => {
      if (block.type === 'bullets') {
        const items = block.items
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `<li style="margin:0 0 8px">${renderTextWithBreaks(item)}</li>`)
          .join('')
        return `
          <section style="margin:0 0 24px">
            ${block.title.trim() ? `<h3 style="font:600 18px/1.4 system-ui,sans-serif;margin:0 0 10px;color:#111827">${renderTextWithBreaks(block.title.trim())}</h3>` : ''}
            ${block.body.trim() ? `<p style="margin:0 0 10px;color:#374151;font:400 15px/1.7 system-ui,sans-serif">${renderTextWithBreaks(block.body.trim())}</p>` : ''}
            ${items ? `<ul style="margin:0;padding-left:20px;color:#111827;font:400 15px/1.7 system-ui,sans-serif">${items}</ul>` : ''}
          </section>
        `
      }
      if (block.type === 'notice') {
        return `
          <section style="margin:0 0 24px;padding:16px 18px;border-radius:12px;background:#f3f4f6">
            ${block.title.trim() ? `<h3 style="font:600 16px/1.4 system-ui,sans-serif;margin:0 0 8px;color:#111827">${renderTextWithBreaks(block.title.trim())}</h3>` : ''}
            ${block.body.trim() ? `<p style="margin:0;color:#374151;font:400 15px/1.7 system-ui,sans-serif">${renderTextWithBreaks(block.body.trim())}</p>` : ''}
          </section>
        `
      }
      return `
        <section style="margin:0 0 24px">
          ${block.title.trim() ? `<h3 style="font:600 18px/1.4 system-ui,sans-serif;margin:0 0 10px;color:#111827">${renderTextWithBreaks(block.title.trim())}</h3>` : ''}
          ${block.body.trim() ? `<p style="margin:0;color:#374151;font:400 15px/1.7 system-ui,sans-serif">${renderTextWithBreaks(block.body.trim())}</p>` : ''}
        </section>
      `
    })
    .join('')

  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font:600 14px/1 system-ui,sans-serif">${renderTextWithBreaks(ctaLabel)}</a></p>`
    : ''

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${renderTextWithBreaks(preheader)}</div>
    <div style="background:#f5f5f5;padding:32px 16px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px 28px">
        ${intro ? `<p style="margin:0 0 24px;color:#111827;font:400 16px/1.8 system-ui,sans-serif">${renderTextWithBreaks(intro)}</p>` : ''}
        ${blocks}
        ${cta}
        ${footer ? `<p style="margin:28px 0 0;color:#6b7280;font:400 13px/1.7 system-ui,sans-serif">${renderTextWithBreaks(footer)}</p>` : ''}
      </div>
    </div>
  `.trim()
}

export function encodeStructuredEmailBody(doc: StructuredEmailDocument): string {
  const payload = encodeBase64(JSON.stringify(doc))
  const html = doc.htmlOverride.trim() || renderStructuredEmailHtml(doc)
  return `${MARKER_PREFIX}${payload}${MARKER_SUFFIX}\n${html}`
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

export function decodeStructuredEmailBody(
  body: string,
): { document: StructuredEmailDocument; renderedHtml: string; usesEmbeddedDocument: boolean } {
  const trimmed = body.trim()
  if (trimmed.startsWith(MARKER_PREFIX)) {
    const markerEnd = trimmed.indexOf(MARKER_SUFFIX)
    if (markerEnd > MARKER_PREFIX.length) {
      const payload = trimmed.slice(MARKER_PREFIX.length, markerEnd)
      try {
        const decoded = decodeBase64(payload)
        const doc = JSON.parse(decoded) as StructuredEmailDocument
        const renderedHtml = trimmed.slice(markerEnd + MARKER_SUFFIX.length).trim()
        return {
          document: {
            ...defaultStructuredEmailDocument(doc.useCase ?? 'generic'),
            ...doc,
            blocks:
              Array.isArray(doc.blocks) && doc.blocks.length > 0
                ? doc.blocks.map((block, index) => ({
                    id:
                      typeof block.id === 'string' && block.id.length > 0
                        ? block.id
                        : newBlockId(index),
                    type:
                      block.type === 'bullets' || block.type === 'notice'
                        ? block.type
                        : 'text',
                    title: typeof block.title === 'string' ? block.title : '',
                    body: typeof block.body === 'string' ? block.body : '',
                    items: Array.isArray(block.items)
                      ? block.items.filter((item): item is string => typeof item === 'string')
                      : [],
                  }))
                : defaultStructuredEmailDocument(doc.useCase ?? 'generic').blocks,
          },
          renderedHtml,
          usesEmbeddedDocument: true,
        }
      } catch {
        // fall through to legacy handling
      }
    }
  }

  const legacyDoc = defaultStructuredEmailDocument('generic')
  legacyDoc.blocks = [
    {
      id: newBlockId(0),
      type: 'text',
      title: '',
      body: stripHtmlToText(trimmed),
      items: [],
    },
  ]
  legacyDoc.htmlOverride = trimmed
  return {
    document: legacyDoc,
    renderedHtml: trimmed,
    usesEmbeddedDocument: false,
  }
}

export const EMAIL_TEMPLATE_TOKENS: Record<EmailTemplateUseCase, string[]> = {
  generic: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{company}}', '{{sourcePageSlug}}'],
  lead_thank_you: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{company}}', '{{website}}', '{{formType}}', '{{sourcePageSlug}}'],
  booking_confirmation: ['{{firstName}}', '{{bookingProfileName}}', '{{scheduledFor}}', '{{slotEnd}}', '{{durationMinutes}}'],
  booking_reminder: ['{{firstName}}', '{{bookingProfileName}}', '{{scheduledFor}}', '{{slotEnd}}'],
  internal_lead_notification: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{company}}', '{{phone}}', '{{sourcePageSlug}}'],
  internal_sync_alert: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{company}}'],
}

export function sampleEmailTemplateVars(
  useCase: EmailTemplateUseCase,
): Record<string, string> {
  const shared = {
    firstName: 'Alex',
    lastName: 'Meyer',
    email: 'alex@example.com',
    phone: '+49 30 123456',
    company: 'Northlight GmbH',
    website: 'https://northlight.example',
    formType: 'contact',
    sourcePageSlug: 'contact',
    bookingProfileName: 'Strategy call',
    scheduledFor: 'Thursday, April 2, 2026 at 14:00',
    slotEnd: 'Thursday, April 2, 2026 at 14:30',
    durationMinutes: '30',
  }
  if (useCase === 'internal_sync_alert') {
    return {
      ...shared,
      firstName: 'Ops',
      lastName: 'Team',
      email: 'ops@example.com',
    }
  }
  return shared
}

export function renderEmailBodyForSend(
  storedBody: string,
  interpolate: (template: string) => string,
): string {
  const decoded = decodeStructuredEmailBody(storedBody)
  const baseHtml =
    decoded.document.htmlOverride.trim() || renderStructuredEmailHtml(decoded.document)
  return interpolate(baseHtml)
}
