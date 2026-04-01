import { parseFormFieldDefinitions, type FormFieldDef } from '@/lib/formFields'

export type FormWidth = 'narrow' | 'default' | 'wide' | 'full'
export type FormColumns = 1 | 2

export type FormConsentConfig = {
  enabled: boolean
  label: string
  required: boolean
}

export type FormLayoutConfig = {
  width: FormWidth
  columns: FormColumns
}

export type FormBuilderDocument = {
  name: string
  intro: string
  submitLabel: string
  successMessage: string
  fields: FormFieldDef[]
  destination: {
    notifyEmails: string[]
  }
  spamProtection: {
    requireCaptcha: boolean
  }
  consent: FormConsentConfig
  layout: FormLayoutConfig
  autoresponderTemplate: number | null
}

function cleanEmailList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.includes('@'))
}

export function defaultFormBuilderDocument(partial?: Partial<FormBuilderDocument>): FormBuilderDocument {
  return {
    name: partial?.name?.trim() || 'Contact form',
    intro: partial?.intro?.trim() || '',
    submitLabel: partial?.submitLabel?.trim() || 'Submit',
    successMessage:
      partial?.successMessage?.trim() || 'Thank you. We will be in touch.',
    fields:
      partial?.fields && partial.fields.length > 0
        ? partial.fields
        : [
            {
              name: 'firstName',
              type: 'text',
              label: 'First name',
              required: true,
              placeholder: '',
              width: 'half',
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Last name',
              required: false,
              placeholder: '',
              width: 'half',
            },
            {
              name: 'email',
              type: 'email',
              label: 'Work email',
              required: true,
              placeholder: '',
              width: 'full',
            },
            {
              name: 'company',
              type: 'text',
              label: 'Company',
              required: false,
              placeholder: '',
              width: 'full',
            },
            {
              name: 'message',
              type: 'textarea',
              label: 'How can we help?',
              required: false,
              placeholder: '',
              width: 'full',
            },
          ],
    destination: {
      notifyEmails: partial?.destination?.notifyEmails ?? [],
    },
    spamProtection: {
      requireCaptcha: partial?.spamProtection?.requireCaptcha ?? false,
    },
    consent: {
      enabled: partial?.consent?.enabled ?? true,
      label:
        partial?.consent?.label?.trim() || 'Keep me updated (optional)',
      required: partial?.consent?.required ?? false,
    },
    layout: {
      width: partial?.layout?.width ?? 'default',
      columns: partial?.layout?.columns === 1 ? 1 : 2,
    },
    autoresponderTemplate:
      typeof partial?.autoresponderTemplate === 'number'
        ? partial.autoresponderTemplate
        : null,
  }
}

export function normalizeFormBuilderDocument(
  raw: Record<string, unknown> | null | undefined,
): FormBuilderDocument {
  const parsedFields = parseFormFieldDefinitions(raw?.fields) ?? undefined
  const destination =
    raw?.destination && typeof raw.destination === 'object' && !Array.isArray(raw.destination)
      ? (raw.destination as { notifyEmails?: unknown })
      : undefined
  const spamProtection =
    raw?.spamProtection &&
    typeof raw.spamProtection === 'object' &&
    !Array.isArray(raw.spamProtection)
      ? (raw.spamProtection as { requireCaptcha?: unknown })
      : undefined
  const consent =
    raw?.consent && typeof raw.consent === 'object' && !Array.isArray(raw.consent)
      ? (raw.consent as { enabled?: unknown; label?: unknown; required?: unknown })
      : undefined
  const layout =
    raw?.layout && typeof raw.layout === 'object' && !Array.isArray(raw.layout)
      ? (raw.layout as { width?: unknown; columns?: unknown })
      : undefined

  return defaultFormBuilderDocument({
    name: typeof raw?.name === 'string' ? raw.name : undefined,
    intro: typeof raw?.intro === 'string' ? raw.intro : undefined,
    submitLabel:
      typeof raw?.submitLabel === 'string' ? raw.submitLabel : undefined,
    successMessage:
      typeof raw?.successMessage === 'string' ? raw.successMessage : undefined,
    fields: parsedFields,
    destination: {
      notifyEmails: cleanEmailList(destination?.notifyEmails),
    },
    spamProtection: {
      requireCaptcha: Boolean(spamProtection?.requireCaptcha),
    },
    consent: {
      enabled: consent?.enabled !== false,
      label: typeof consent?.label === 'string' ? consent.label : '',
      required: Boolean(consent?.required),
    },
    layout: {
      width:
        layout?.width === 'narrow' ||
        layout?.width === 'wide' ||
        layout?.width === 'full'
          ? layout.width
          : 'default',
      columns: layout?.columns === 1 ? 1 : 2,
    },
    autoresponderTemplate:
      typeof raw?.autoresponderTemplate === 'number'
        ? raw.autoresponderTemplate
        : null,
  })
}

export function formBuilderDocumentToRecord(
  doc: FormBuilderDocument,
): Record<string, unknown> {
  return {
    name: doc.name.trim(),
    intro: doc.intro.trim() || undefined,
    submitLabel: doc.submitLabel.trim() || undefined,
    successMessage: doc.successMessage.trim() || undefined,
    fields: doc.fields.map((field) => ({
      name: field.name,
      type: field.type,
      label: field.label,
      required: field.required ?? false,
      placeholder: field.placeholder ?? '',
      helperText: field.helperText ?? '',
      width: field.width ?? 'full',
    })),
    destination:
      doc.destination.notifyEmails.length > 0
        ? { notifyEmails: doc.destination.notifyEmails }
        : undefined,
    spamProtection: {
      requireCaptcha: doc.spamProtection.requireCaptcha,
    },
    consent: doc.consent.enabled
      ? {
          enabled: true,
          label: doc.consent.label.trim() || 'Keep me updated (optional)',
          required: doc.consent.required,
        }
      : { enabled: false },
    layout: {
      width: doc.layout.width,
      columns: doc.layout.columns,
    },
    autoresponderTemplate: doc.autoresponderTemplate,
  }
}
