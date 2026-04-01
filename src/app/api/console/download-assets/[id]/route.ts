import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsDownloadAssets } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    fileUrl: z.string().min(1).max(2000).optional(),
    fileLabel: z.string().max(200).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsDownloadAssets.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    fileUrl: row.fileUrl,
    fileLabel: row.fileLabel,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const rows = await db.select().from(cmsDownloadAssets).where(eq(cmsDownloadAssets.id, id)).limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, downloadAsset: rowJson(row) })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const id = Number.parseInt((await ctx.params).id, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

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

  const existing = await db.select().from(cmsDownloadAssets).where(eq(cmsDownloadAssets.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const update: Partial<typeof cmsDownloadAssets.$inferInsert> = { updatedAt: now }
  if (parsed.data.title !== undefined) update.title = parsed.data.title
  if (parsed.data.description !== undefined) update.description = parsed.data.description
  if (parsed.data.fileUrl !== undefined) update.fileUrl = parsed.data.fileUrl
  if (parsed.data.fileLabel !== undefined) update.fileLabel = parsed.data.fileLabel
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsDownloadAssets).set(update).where(eq(cmsDownloadAssets.id, id))

  const rows = await db.select().from(cmsDownloadAssets).where(eq(cmsDownloadAssets.id, id)).limit(1)
  return NextResponse.json({ ok: true, downloadAsset: rowJson(rows[0]!) })
}
