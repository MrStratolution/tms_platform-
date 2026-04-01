import { describe, expect, it } from 'vitest'

import {
  defaultFormBuilderDocument,
  formBuilderDocumentToRecord,
  normalizeFormBuilderDocument,
} from '@/lib/formConfigDocument'

describe('formConfigDocument', () => {
  it('creates sensible defaults', () => {
    const doc = defaultFormBuilderDocument()

    expect(doc.name).toBe('Contact form')
    expect(doc.layout.width).toBe('default')
    expect(doc.layout.columns).toBe(2)
    expect(doc.fields.length).toBeGreaterThan(0)
  })

  it('round-trips guided form documents through the stored JSON shape', () => {
    const source = defaultFormBuilderDocument({
      name: 'Discovery form',
      intro: 'Tell us more',
      submitLabel: 'Send request',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          label: 'First name',
          required: true,
          placeholder: '',
          helperText: '',
          width: 'half',
        },
        {
          name: 'context',
          type: 'textarea',
          label: 'Context',
          required: true,
          placeholder: '',
          helperText: 'Share the setup.',
          width: 'full',
        },
      ],
      destination: { notifyEmails: ['ops@example.com'] },
      spamProtection: { requireCaptcha: true },
      consent: { enabled: true, label: 'Keep me updated', required: false },
      layout: { width: 'wide', columns: 1 },
      autoresponderTemplate: 4,
    })

    const stored = formBuilderDocumentToRecord(source)
    const normalized = normalizeFormBuilderDocument(stored)

    expect(normalized.name).toBe('Discovery form')
    expect(normalized.destination.notifyEmails).toEqual(['ops@example.com'])
    expect(normalized.spamProtection.requireCaptcha).toBe(true)
    expect(normalized.layout.width).toBe('wide')
    expect(normalized.layout.columns).toBe(1)
    expect(normalized.autoresponderTemplate).toBe(4)
    expect(normalized.fields[1]?.helperText).toBe('Share the setup.')
  })
})
