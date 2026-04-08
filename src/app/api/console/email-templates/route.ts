import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsEmailTemplates } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

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
      key: cmsEmailTemplates.key,
      language: cmsEmailTemplates.language,
      subject: cmsEmailTemplates.subject,
      active: cmsEmailTemplates.active,
      updatedAt: cmsEmailTemplates.updatedAt,
    })
    .from(cmsEmailTemplates)
    .orderBy(asc(cmsEmailTemplates.key), asc(cmsEmailTemplates.language))

  return NextResponse.json({
    ok: true,
    emailTemplates: rows.map((row) => ({
      id: row.id,
      key: row.key,
      language: row.language === 'en' ? 'en' : 'de',
      name: `${row.key} (${String(row.language).toUpperCase()})`,
      slug: row.key,
      subject: row.subject,
      active: row.active,
      updatedAt: row.updatedAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  return NextResponse.json(
    { error: 'Use /console/email-system/templates to manage seeded SMTP templates.' },
    { status: 405 },
  )
}
