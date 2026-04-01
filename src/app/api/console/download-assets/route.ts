import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsDownloadAssets } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  fileUrl: z.string().min(1).max(2000),
  fileLabel: z.string().max(200).optional(),
  active: z.boolean().optional(),
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
      id: cmsDownloadAssets.id,
      title: cmsDownloadAssets.title,
      fileUrl: cmsDownloadAssets.fileUrl,
      active: cmsDownloadAssets.active,
      updatedAt: cmsDownloadAssets.updatedAt,
    })
    .from(cmsDownloadAssets)
    .orderBy(asc(cmsDownloadAssets.id))

  return NextResponse.json({
    ok: true,
    downloadAssets: rows.map((r) => ({
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

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()
  const [row] = await db
    .insert(cmsDownloadAssets)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fileUrl: parsed.data.fileUrl,
      fileLabel: parsed.data.fileLabel ?? null,
      active: parsed.data.active ?? true,
      updatedAt: now,
      createdAt: now,
    })
    .returning()

  return NextResponse.json({
    ok: true,
    downloadAsset: {
      id: row!.id,
      title: row!.title,
      description: row!.description,
      fileUrl: row!.fileUrl,
      fileLabel: row!.fileLabel,
      active: row!.active,
      updatedAt: row!.updatedAt.toISOString(),
      createdAt: row!.createdAt.toISOString(),
    },
  })
}
