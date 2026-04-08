import { and, asc, desc, eq } from 'drizzle-orm'

import { cmsEmailLogs, cmsEmailTemplates, cmsSmtpSettings } from '@/db/schema'
import type { CmsDb } from '@/lib/cmsData'

import {
  normalizeEmailLanguage,
  type EmailLanguage,
  type SmtpSettingsInput,
} from './systemSchemas'

export type StoredSmtpSettings = {
  id: number
  host: string
  port: number
  secure: boolean
  username: string
  passwordEncrypted: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PublicSmtpSettings = Omit<StoredSmtpSettings, 'passwordEncrypted'> & {
  hasPassword: boolean
}

export type StoredEmailTemplate = {
  id: number
  key: string
  language: EmailLanguage
  subject: string
  htmlBody: string
  variablesJson: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export type StoredEmailLog = {
  id: number
  templateKey: string
  recipient: string
  language: EmailLanguage
  subject: string
  status: string
  errorMessage: string | null
  payloadJson: Record<string, unknown>
  sentAt: string | null
  createdAt: string
}

function mapSmtpRow(row: typeof cmsSmtpSettings.$inferSelect): StoredSmtpSettings {
  return {
    id: row.id,
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    passwordEncrypted: row.passwordEncrypted,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapTemplateRow(row: typeof cmsEmailTemplates.$inferSelect): StoredEmailTemplate {
  return {
    id: row.id,
    key: row.key,
    language: normalizeEmailLanguage(row.language),
    subject: row.subject,
    htmlBody: row.htmlBody,
    variablesJson: Array.isArray(row.variablesJson)
      ? row.variablesJson.filter((item): item is string => typeof item === 'string')
      : [],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapLogRow(row: typeof cmsEmailLogs.$inferSelect): StoredEmailLog {
  return {
    id: row.id,
    templateKey: row.templateKey,
    recipient: row.recipient,
    language: normalizeEmailLanguage(row.language),
    subject: row.subject,
    status: row.status,
    errorMessage: row.errorMessage,
    payloadJson:
      row.payloadJson && typeof row.payloadJson === 'object' && !Array.isArray(row.payloadJson)
        ? (row.payloadJson as Record<string, unknown>)
        : {},
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function getLatestSmtpSettings(db: CmsDb): Promise<StoredSmtpSettings | null> {
  const rows = await db
    .select()
    .from(cmsSmtpSettings)
    .orderBy(desc(cmsSmtpSettings.updatedAt), desc(cmsSmtpSettings.id))
    .limit(1)
  return rows[0] ? mapSmtpRow(rows[0]) : null
}

export async function getActiveSmtpSettings(db: CmsDb): Promise<StoredSmtpSettings | null> {
  const rows = await db
    .select()
    .from(cmsSmtpSettings)
    .where(eq(cmsSmtpSettings.active, true))
    .orderBy(desc(cmsSmtpSettings.updatedAt), desc(cmsSmtpSettings.id))
    .limit(1)
  return rows[0] ? mapSmtpRow(rows[0]) : null
}

export async function upsertSmtpSettings(
  db: CmsDb,
  input: SmtpSettingsInput & { passwordEncrypted: string },
): Promise<StoredSmtpSettings> {
  const now = new Date()
  const current = await getLatestSmtpSettings(db)
  if (!current) {
    const [row] = await db
      .insert(cmsSmtpSettings)
      .values({
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        passwordEncrypted: input.passwordEncrypted,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyTo: input.replyTo?.trim() || null,
        active: input.active,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return mapSmtpRow(row!)
  }

  const [row] = await db
    .update(cmsSmtpSettings)
    .set({
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      passwordEncrypted: input.passwordEncrypted,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      replyTo: input.replyTo?.trim() || null,
      active: input.active,
      updatedAt: now,
    })
    .where(eq(cmsSmtpSettings.id, current.id))
    .returning()
  return mapSmtpRow(row!)
}

export function toPublicSmtpSettings(row: StoredSmtpSettings | null): PublicSmtpSettings | null {
  if (!row) return null
  const { passwordEncrypted: _passwordEncrypted, ...rest } = row
  void _passwordEncrypted
  return { ...rest, hasPassword: Boolean(row.passwordEncrypted) }
}

export async function listSystemEmailTemplates(db: CmsDb): Promise<StoredEmailTemplate[]> {
  const rows = await db
    .select()
    .from(cmsEmailTemplates)
    .orderBy(asc(cmsEmailTemplates.key), asc(cmsEmailTemplates.language))
  return rows.map(mapTemplateRow)
}

export async function getSystemEmailTemplateById(
  db: CmsDb,
  id: number,
): Promise<StoredEmailTemplate | null> {
  const rows = await db
    .select()
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.id, id))
    .limit(1)
  return rows[0] ? mapTemplateRow(rows[0]) : null
}

export async function createSystemEmailTemplate(
  db: CmsDb,
  input: {
    key: string
    language: EmailLanguage
    subject: string
    htmlBody: string
    variablesJson: string[]
    active: boolean
  },
): Promise<StoredEmailTemplate> {
  const now = new Date()
  const [row] = await db
    .insert(cmsEmailTemplates)
    .values({
      key: input.key,
      language: input.language,
      subject: input.subject,
      htmlBody: input.htmlBody,
      variablesJson: input.variablesJson,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return mapTemplateRow(row!)
}

export async function getSystemEmailTemplate(
  db: CmsDb,
  key: string,
  language: EmailLanguage,
): Promise<StoredEmailTemplate | null> {
  const requested = await db
    .select()
    .from(cmsEmailTemplates)
    .where(
      and(
        eq(cmsEmailTemplates.key, key),
        eq(cmsEmailTemplates.language, language),
        eq(cmsEmailTemplates.active, true),
      ),
    )
    .limit(1)
  if (requested[0]) return mapTemplateRow(requested[0])

  if (language !== 'de') {
    const fallback = await db
      .select()
      .from(cmsEmailTemplates)
      .where(
        and(
          eq(cmsEmailTemplates.key, key),
          eq(cmsEmailTemplates.language, 'de'),
          eq(cmsEmailTemplates.active, true),
        ),
      )
      .limit(1)
    if (fallback[0]) return mapTemplateRow(fallback[0])
  }

  return null
}

export async function updateSystemEmailTemplate(
  db: CmsDb,
  id: number,
  patch: {
    subject: string
    htmlBody: string
    active: boolean
  },
): Promise<StoredEmailTemplate | null> {
  const [row] = await db
    .update(cmsEmailTemplates)
    .set({
      subject: patch.subject,
      htmlBody: patch.htmlBody,
      active: patch.active,
      updatedAt: new Date(),
    })
    .where(eq(cmsEmailTemplates.id, id))
    .returning()
  return row ? mapTemplateRow(row) : null
}

export async function createEmailLog(
  db: CmsDb,
  input: {
    templateKey: string
    recipient: string
    language: EmailLanguage
    subject: string
    status: string
    errorMessage?: string | null
    payloadJson: Record<string, unknown>
    sentAt?: Date | null
  },
) {
  await db.insert(cmsEmailLogs).values({
    leadId: null,
    templateId: null,
    templateKey: input.templateKey,
    recipient: input.recipient,
    language: input.language,
    subject: input.subject,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
    payloadJson: input.payloadJson,
    providerMessageId: null,
    sentAt: input.sentAt ?? null,
    updatedAt: new Date(),
    createdAt: new Date(),
  })
}

export async function listEmailLogs(
  db: CmsDb,
  limit = 100,
): Promise<StoredEmailLog[]> {
  const rows = await db
    .select()
    .from(cmsEmailLogs)
    .orderBy(desc(cmsEmailLogs.createdAt), desc(cmsEmailLogs.id))
    .limit(limit)
  return rows.map(mapLogRow)
}
