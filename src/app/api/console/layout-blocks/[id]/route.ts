import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsLayoutBlocks } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).nullable().optional(),
    block: z.record(z.unknown()).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

function rowJson(row: typeof cmsLayoutBlocks.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    block: row.block,
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

  const rows = await db.select().from(cmsLayoutBlocks).where(eq(cmsLayoutBlocks.id, id)).limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true, layoutBlock: rowJson(row) })
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

  const existing = await db.select().from(cmsLayoutBlocks).where(eq(cmsLayoutBlocks.id, id)).limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (parsed.data.block !== undefined) {
    const bt = (parsed.data.block as { blockType?: unknown }).blockType
    if (typeof bt !== 'string') {
      return NextResponse.json(
        { error: 'block.blockType is required when block is sent' },
        { status: 400 },
      )
    }
  }

  const now = new Date()
  const update: Partial<typeof cmsLayoutBlocks.$inferInsert> = { updatedAt: now }
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim()
  if (parsed.data.description !== undefined) update.description = parsed.data.description
  if (parsed.data.block !== undefined) update.block = parsed.data.block
  if (parsed.data.active !== undefined) update.active = parsed.data.active

  await db.update(cmsLayoutBlocks).set(update).where(eq(cmsLayoutBlocks.id, id))

  const rows = await db.select().from(cmsLayoutBlocks).where(eq(cmsLayoutBlocks.id, id)).limit(1)
  return NextResponse.json({ ok: true, layoutBlock: rowJson(rows[0]!) })
}
