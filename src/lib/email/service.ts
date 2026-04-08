import nodemailer from 'nodemailer'

import { cmsEmailLogs } from '@/db/schema'
import type { CmsDb } from '@/lib/cmsData'
import {
  getActiveSmtpSettings,
  getEmailTemplateById,
  getEmailTemplateByKeyAndLanguage,
} from '@/lib/cmsData'
import { renderEmailBodyForSend } from '@/lib/emailTemplateContent'
import { logEvent } from '@/lib/logger'
import type { EmailTemplate } from '@/types/cms'

import { decryptSmtpPassword } from './passwordCrypto'
import {
  interpolateHtmlTemplate,
  interpolatePlainTemplate,
  normalizeEmailLanguage,
  sanitizeEmailSubject,
  type EmailLanguage,
  type EmailVariables,
} from './templateVariables'

type BaseSendParams = {
  db: CmsDb
  to: string
  language?: string | null
  variables?: EmailVariables
  leadId?: number
}

export type SendEmailParams = BaseSendParams & {
  templateKey: string
}

export type SendEmailByIdParams = BaseSendParams & {
  templateId: number
}

export type SendEmailResult = {
  ok: boolean
  status: 'sent' | 'failed'
  error?: string
  templateId?: number
  templateKey?: string
  messageId?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function payloadForLog(
  template: EmailTemplate | null,
  language: EmailLanguage,
  variables: EmailVariables,
) {
  return {
    templateKey: template?.key ?? null,
    templateLanguage: template?.language ?? language,
    variables,
  }
}

async function writeEmailLog(params: {
  db: CmsDb
  leadId?: number
  template: EmailTemplate | null
  recipient: string
  language: EmailLanguage
  subject: string
  status: 'sent' | 'failed'
  errorMessage?: string
  payloadJson: Record<string, unknown>
  providerMessageId?: string | null
}) {
  const now = new Date()
  await params.db.insert(cmsEmailLogs).values({
    leadId: params.leadId ?? null,
    templateId: params.template?.id ?? null,
    templateKey: params.template?.key ?? 'unknown',
    recipient: params.recipient,
    language: params.language,
    subject: params.subject,
    status: params.status,
    errorMessage: params.errorMessage ?? null,
    payloadJson: params.payloadJson,
    providerMessageId: params.providerMessageId ?? null,
    sentAt: params.status === 'sent' ? now : null,
    createdAt: now,
    updatedAt: now,
  })
}

async function resolveTemplateById(
  db: CmsDb,
  templateId: number,
): Promise<EmailTemplate | null> {
  const template = await getEmailTemplateById(db, templateId)
  if (!template || template.active === false) return null
  return template
}

async function deliverTemplate(params: {
  db: CmsDb
  template: EmailTemplate | null
  to: string
  language: EmailLanguage
  variables: EmailVariables
  leadId?: number
}): Promise<SendEmailResult> {
  const { db, template, to, language, variables, leadId } = params

  if (!template) {
    const error = 'Email template not found'
    await writeEmailLog({
      db,
      leadId,
      template,
      recipient: to,
      language,
      subject: 'Template missing',
      status: 'failed',
      errorMessage: error,
      payloadJson: payloadForLog(template, language, variables),
    })
    return { ok: false, status: 'failed', error }
  }

  const smtp = await getActiveSmtpSettings(db)
  if (!smtp) {
    const error = 'SMTP settings are not configured'
    const subject = sanitizeEmailSubject(
      interpolatePlainTemplate(template.subject, variables),
    )
    await writeEmailLog({
      db,
      leadId,
      template,
      recipient: to,
      language,
      subject,
      status: 'failed',
      errorMessage: error,
      payloadJson: payloadForLog(template, language, variables),
    })
    return {
      ok: false,
      status: 'failed',
      error,
      templateId: template.id,
      templateKey: template.key,
    }
  }

  const subject = sanitizeEmailSubject(
    interpolatePlainTemplate(template.subject, variables),
  )
  const html = renderEmailBodyForSend(template.htmlBody, (value) =>
    interpolateHtmlTemplate(value, variables),
  )
  const text = stripHtml(html)

  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: decryptSmtpPassword(smtp.passwordEncrypted),
      },
    })

    const info = await transport.sendMail({
      from: `${smtp.fromName} <${smtp.fromEmail}>`,
      replyTo: smtp.replyTo || undefined,
      to,
      subject,
      html,
      text,
    })

    await writeEmailLog({
      db,
      leadId,
      template,
      recipient: to,
      language,
      subject,
      status: 'sent',
      payloadJson: payloadForLog(template, language, variables),
      providerMessageId: info.messageId,
    })

    logEvent({
      event: 'email_sent',
      leadId,
      templateKey: template.key,
      templateId: template.id,
      to,
      language,
      messageId: info.messageId,
    })

    return {
      ok: true,
      status: 'sent',
      templateId: template.id,
      templateKey: template.key,
      messageId: info.messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP send failed'
    await writeEmailLog({
      db,
      leadId,
      template,
      recipient: to,
      language,
      subject,
      status: 'failed',
      errorMessage: message,
      payloadJson: payloadForLog(template, language, variables),
    })
    logEvent({
      event: 'email_failed',
      leadId,
      templateKey: template.key,
      templateId: template.id,
      to,
      language,
      error: message,
    })
    return {
      ok: false,
      status: 'failed',
      error: message,
      templateId: template.id,
      templateKey: template.key,
    }
  }
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const language = normalizeEmailLanguage(params.language)
  const template = await getEmailTemplateByKeyAndLanguage(
    params.db,
    params.templateKey,
    language,
  )

  return deliverTemplate({
    db: params.db,
    template,
    to: params.to,
    language,
    variables: params.variables ?? {},
    leadId: params.leadId,
  })
}

export async function sendEmailByTemplateId(
  params: SendEmailByIdParams,
): Promise<SendEmailResult> {
  const language = normalizeEmailLanguage(params.language)
  const template = await resolveTemplateById(params.db, params.templateId)
  return deliverTemplate({
    db: params.db,
    template,
    to: params.to,
    language,
    variables: params.variables ?? {},
    leadId: params.leadId,
  })
}

export async function sendSmtpTestEmail(params: {
  db: CmsDb
  to: string
  language?: string | null
}): Promise<SendEmailResult> {
  const language = normalizeEmailLanguage(params.language)
  const smtp = await getActiveSmtpSettings(params.db)
  if (!smtp) {
    return {
      ok: false,
      status: 'failed',
      error: 'SMTP settings are not configured',
    }
  }

  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: decryptSmtpPassword(smtp.passwordEncrypted),
      },
    })

    const subject =
      language === 'en'
        ? 'TMA SMTP test email'
        : 'TMA SMTP-Testnachricht'
    const html =
      language === 'en'
        ? '<p>This is a test email from the TMA Platform SMTP settings screen.</p>'
        : '<p>Dies ist eine Test-E-Mail aus dem SMTP-Einstellungsbereich der TMA Platform.</p>'
    const info = await transport.sendMail({
      from: `${smtp.fromName} <${smtp.fromEmail}>`,
      replyTo: smtp.replyTo || undefined,
      to: params.to,
      subject,
      html,
      text: stripHtml(html),
    })

    await writeEmailLog({
      db: params.db,
      recipient: params.to,
      language,
      subject,
      status: 'sent',
      payloadJson: { test: true },
      template: null,
      providerMessageId: info.messageId,
    })

    return {
      ok: true,
      status: 'sent',
      messageId: info.messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP test failed'
    await writeEmailLog({
      db: params.db,
      recipient: params.to,
      language,
      subject: language === 'en' ? 'TMA SMTP test email' : 'TMA SMTP-Testnachricht',
      status: 'failed',
      errorMessage: message,
      payloadJson: { test: true },
      template: null,
    })
    return { ok: false, status: 'failed', error: message }
  }
}
