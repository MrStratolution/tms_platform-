import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { consoleUserCanEditCustomCss } from '@/lib/console/rbac'
import {
  ensureSiteSettingsRow,
  mergeSiteSettingsDocumentPatch,
  parseSiteSettingsDocument,
  siteSettingsPatchDocumentSchema,
  updateSiteSettingsDocument,
} from '@/lib/siteSettings'

const patchSchema = z.object({
  document: siteSettingsPatchDocumentSchema,
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const row = await ensureSiteSettingsRow(db)
  const document = parseSiteSettingsDocument(row.document)

  return NextResponse.json({
    ok: true,
    siteSettings: {
      id: row.id,
      document,
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}

export async function PATCH(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const existing = await ensureSiteSettingsRow(db)
  const prev = parseSiteSettingsDocument(existing.document)
  let patch = parsed.data.document
  if (!consoleUserCanEditCustomCss(auth.user.role)) {
    const { customCss: _omit, ...rest } = patch
    void _omit
    patch = rest
  }
  const merged = mergeSiteSettingsDocumentPatch(prev, patch)
  if (!merged.ok) {
    return NextResponse.json({ error: merged.message }, { status: 400 })
  }

  const row = await updateSiteSettingsDocument(db, merged.document)

  return NextResponse.json({
    ok: true,
    siteSettings: {
      id: row.id,
      document: parseSiteSettingsDocument(row.document),
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
