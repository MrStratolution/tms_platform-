import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsFaqEntries } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const createSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(20000),
  sortOrder: z.number().int().optional(),
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
      id: cmsFaqEntries.id,
      question: cmsFaqEntries.question,
      active: cmsFaqEntries.active,
      sortOrder: cmsFaqEntries.sortOrder,
      updatedAt: cmsFaqEntries.updatedAt,
    })
    .from(cmsFaqEntries)
    .orderBy(asc(cmsFaqEntries.sortOrder), asc(cmsFaqEntries.id))

  return NextResponse.json({
    ok: true,
    faqEntries: rows.map((r) => ({
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
    .insert(cmsFaqEntries)
    .values({
      question: parsed.data.question,
      answer: parsed.data.answer,
      sortOrder: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
      updatedAt: now,
      createdAt: now,
    })
    .returning()

  return NextResponse.json({
    ok: true,
    faqEntry: {
      id: row!.id,
      question: row!.question,
      answer: row!.answer,
      sortOrder: row!.sortOrder,
      active: row!.active,
      updatedAt: row!.updatedAt.toISOString(),
      createdAt: row!.createdAt.toISOString(),
    },
  })
}
