import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsLayoutBlocks } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  block: z.record(z.unknown()),
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
      id: cmsLayoutBlocks.id,
      name: cmsLayoutBlocks.name,
      active: cmsLayoutBlocks.active,
      updatedAt: cmsLayoutBlocks.updatedAt,
    })
    .from(cmsLayoutBlocks)
    .orderBy(asc(cmsLayoutBlocks.name), asc(cmsLayoutBlocks.id))

  return NextResponse.json({
    ok: true,
    layoutBlocks: rows.map((r) => ({
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

  const b = parsed.data.block
  if (typeof b.blockType !== 'string') {
    return NextResponse.json({ error: 'block.blockType is required' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()
  const [row] = await db
    .insert(cmsLayoutBlocks)
    .values({
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      block: parsed.data.block,
      active: parsed.data.active ?? true,
      updatedAt: now,
      createdAt: now,
    })
    .returning()

  return NextResponse.json({
    ok: true,
    layoutBlock: {
      id: row!.id,
      name: row!.name,
      description: row!.description,
      block: row!.block,
      active: row!.active,
      updatedAt: row!.updatedAt.toISOString(),
      createdAt: row!.createdAt.toISOString(),
    },
  })
}
