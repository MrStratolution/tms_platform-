import { mkdir, unlink, writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import { desc, eq, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { join } from 'path'

import { getCustomDb } from '@/db/client'
import { cmsMedia } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])
const IMAGE_MAX_BYTES = 8 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let rows
  try {
    rows = await db
      .select({
        id: cmsMedia.id,
        storageKey: cmsMedia.storageKey,
        filename: cmsMedia.filename,
        alt: cmsMedia.alt,
        mimeType: cmsMedia.mimeType,
        byteSize: cmsMedia.byteSize,
        folder: cmsMedia.folder,
        createdAt: cmsMedia.createdAt,
      })
      .from(cmsMedia)
      .orderBy(desc(cmsMedia.createdAt))
      .limit(500)
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }

  const origin = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || ''

  return NextResponse.json({
    ok: true,
    media: rows.map((r) => ({
      id: r.id,
      storageKey: r.storageKey,
      publicUrl: r.storageKey.startsWith('http')
        ? r.storageKey
        : `${origin}/${r.storageKey.replace(/^\//, '')}`,
      filename: r.filename,
      alt: r.alt,
      mimeType: r.mimeType,
      byteSize: r.byteSize,
      folder: r.folder,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: 'Unsupported type (use jpeg, png, webp, gif, svg, mp4, webm, or mov)' },
      { status: 415 },
    )
  }
  const isVideo = mimeType.startsWith('video/')
  if (file.size > (isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES)) {
    return NextResponse.json(
      { error: isVideo ? 'Video too large (max 50MB)' : 'File too large (max 8MB)' },
      { status: 413 },
    )
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload'
  const relativeKey = `uploads/cms/${randomUUID()}-${safeName}`
  const absDir = join(process.cwd(), 'public', 'uploads', 'cms')
  const absFile = join(process.cwd(), 'public', relativeKey)

  await mkdir(absDir, { recursive: true })
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(absFile, buf)

  const altRaw = formData.get('alt')
  const alt = typeof altRaw === 'string' && altRaw.trim() ? altRaw.trim() : null
  const folderRaw = formData.get('folder')
  const folder = typeof folderRaw === 'string' && folderRaw.trim() ? folderRaw.trim() : null

  let row
  try {
    ;[row] = await db
      .insert(cmsMedia)
      .values({
        storageKey: relativeKey,
        filename: safeName,
        alt,
        mimeType,
        byteSize: buf.length,
        folder,
      })
      .returning()
  } catch (e) {
    if (isMissingDbRelationError(e)) {
      await unlink(absFile).catch(() => {})
      return missingRelationJsonResponse()
    }
    await unlink(absFile).catch(() => {})
    throw e
  }

  const origin = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || ''

  return NextResponse.json({
    ok: true,
    media: {
      id: row!.id,
      storageKey: row!.storageKey,
      publicUrl: `${origin}/${relativeKey}`,
      filename: row!.filename,
      alt: row!.alt,
      folder: row!.folder,
      createdAt: row!.createdAt.toISOString(),
    },
  })
}

export async function DELETE(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { ids?: number[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const ids = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Missing ids array' }, { status: 400 })
  }

  try {
    // 1. Fetch storage keys for all files to be deleted
    const items = await db
      .select({ id: cmsMedia.id, storageKey: cmsMedia.storageKey })
      .from(cmsMedia)
      .where(inArray(cmsMedia.id, ids))

    if (items.length === 0) {
      return NextResponse.json({ ok: true, deletedCount: 0 })
    }

    // 2. Delete files from disk
    for (const item of items) {
      if (item.storageKey && !item.storageKey.startsWith('http')) {
        const absFile = join(process.cwd(), 'public', item.storageKey)
        await unlink(absFile).catch((e) => {
          console.warn(`Failed to delete file from disk: ${absFile}`, e)
        })
      }
    }

    // 3. Delete records from database
    await db.delete(cmsMedia).where(inArray(cmsMedia.id, ids))

    return NextResponse.json({
      ok: true,
      deletedCount: items.length,
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}
