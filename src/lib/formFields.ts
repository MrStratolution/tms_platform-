import { z } from 'zod'

const fieldDefSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Use letters, numbers, underscore; start with a letter'),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'url', 'checkbox', 'section']),
  label: z.string().min(1).max(200),
  required: z.boolean().optional(),
  placeholder: z.string().max(300).optional(),
  helperText: z.string().max(300).optional(),
  width: z.enum(['half', 'full']).optional(),
})

export type FormFieldDef = z.infer<typeof fieldDefSchema>

const STANDARD_LEAD = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'website',
])

export function parseFormFieldDefinitions(raw: unknown): FormFieldDef[] | null {
  if (raw == null) return null
  if (!Array.isArray(raw)) return null
  const out: FormFieldDef[] = []
  for (const item of raw) {
    const p = fieldDefSchema.safeParse(item)
    if (!p.success) return null
    out.push(p.data)
  }
  return out
}

/**
 * Split flat submission into lead core + extras for `submissionExtras`.
 */
export function partitionLeadFields(
  flat: Record<string, string>,
): { lead: Record<string, string | undefined>; extras: Record<string, string> } {
  const lead: Record<string, string | undefined> = {}
  const extras: Record<string, string> = {}
  for (const [k, v] of Object.entries(flat)) {
    if (STANDARD_LEAD.has(k)) {
      lead[k] = v
    } else {
      extras[k] = v
    }
  }
  return { lead, extras }
}

export function validateRequiredFields(
  fields: FormFieldDef[],
  flat: Record<string, string>,
): string | null {
  for (const f of fields) {
    if (f.type === 'section') continue
    if (!f.required) continue
    const v = flat[f.name]
    if (f.type === 'checkbox') {
      if (v !== 'on' && v !== 'true' && v !== '1') {
        return `Missing: ${f.label}`
      }
    } else if (v == null || String(v).trim() === '') {
      return `Missing: ${f.label}`
    }
  }
  return null
}
