import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsEmailTemplates } from '@/db/schema'
import {
  defaultStructuredEmailDocument,
  encodeStructuredEmailBody,
  type EmailTemplateUseCase,
} from '@/lib/emailTemplateContent'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { validatePageSlug } from '@/lib/cms/pageSlug'

const createSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  subject: z.string().min(1).max(998),
  useCase: z
    .enum([
      'generic',
      'lead_thank_you',
      'booking_confirmation',
      'booking_reminder',
      'internal_lead_notification',
      'internal_sync_alert',
    ])
    .optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const rows = await db
    .select({
      id: cmsEmailTemplates.id,
      slug: cmsEmailTemplates.slug,
      name: cmsEmailTemplates.name,
      subject: cmsEmailTemplates.subject,
      updatedAt: cmsEmailTemplates.updatedAt,
    })
    .from(cmsEmailTemplates)
    .orderBy(asc(cmsEmailTemplates.slug))

  return NextResponse.json({
    ok: true,
    emailTemplates: rows.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const slugCheck = validatePageSlug(parsed.data.slug)
  if (!slugCheck.ok) {
    return NextResponse.json({ error: slugCheck.error }, { status: 400 })
  }

  const useCase = (parsed.data.useCase ?? 'generic') as EmailTemplateUseCase
  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()
  const body = encodeStructuredEmailBody(defaultStructuredEmailDocument(useCase))

  try {
    const [row] = await db
      .insert(cmsEmailTemplates)
      .values({
        slug: slugCheck.slug,
        name: parsed.data.name.trim(),
        subject: parsed.data.subject.trim(),
        body,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      ok: true,
      emailTemplate: {
        id: row!.id,
        slug: row!.slug,
        name: row!.name,
        subject: row!.subject,
        updatedAt: row!.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
