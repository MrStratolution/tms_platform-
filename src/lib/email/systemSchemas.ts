import { z } from 'zod'

export const EMAIL_LANGUAGES = ['de', 'en'] as const

export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number]

export function normalizeEmailLanguage(value: string | null | undefined): EmailLanguage {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'de'
}

export const smtpSettingsInputSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1).max(255),
  password: z.string().max(4000).optional(),
  fromName: z.string().trim().min(1).max(255),
  fromEmail: z.string().trim().email().max(320),
  replyTo: z.string().trim().email().max(320).optional().or(z.literal('')),
  active: z.boolean(),
})

export const smtpTestEmailSchema = z.object({
  to: z.string().trim().email().max(320),
})

export const emailTemplatePatchSchema = z.object({
  subject: z.string().trim().min(1).max(998),
  htmlBody: z.string().trim().min(1).max(100_000),
  active: z.boolean(),
})

export const emailTemplateCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      'Template key must start with a letter and use only lowercase letters, numbers, hyphens, or underscores',
    ),
  language: z.enum(EMAIL_LANGUAGES),
  subject: z.string().trim().min(1).max(998),
  htmlBody: z.string().trim().min(1).max(100_000),
  variablesJson: z.array(z.string().trim().min(1).max(120)).max(100),
  active: z.boolean(),
})

export type SmtpSettingsInput = z.infer<typeof smtpSettingsInputSchema>
