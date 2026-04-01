import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsFormConfigs } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'

const createSchema = z.object({
  formType: z.string().min(1).max(120),
  active: z.boolean().optional(),
  document: z.record(z.unknown()).optional(),
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
      id: cmsFormConfigs.id,
      formType: cmsFormConfigs.formType,
      active: cmsFormConfigs.active,
      updatedAt: cmsFormConfigs.updatedAt,
    })
    .from(cmsFormConfigs)
    .orderBy(asc(cmsFormConfigs.formType))

  return NextResponse.json({
    ok: true,
    formConfigs: rows.map((r) => ({
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

  const rawType = parsed.data.formType.trim().toLowerCase()
  if (!/^[a-z][a-z0-9_-]*$/.test(rawType)) {
    return NextResponse.json(
      { error: 'Form type must start with a letter and use only lowercase letters, numbers, hyphens, or underscores' },
      { status: 400 },
    )
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const now = new Date()

  const existing = await db
    .select({ id: cmsFormConfigs.id })
    .from(cmsFormConfigs)
    .where(eq(cmsFormConfigs.formType, rawType))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: `A form config with the key "${rawType}" already exists. Choose a different form key.`,
      },
      { status: 409 },
    )
  }

  try {
    const [row] = await db
      .insert(cmsFormConfigs)
      .values({
        formType: rawType,
        active: parsed.data.active ?? true,
        document: parsed.data.document ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      ok: true,
      formConfig: {
        id: row!.id,
        formType: row!.formType,
        active: row!.active,
        document: row!.document,
        updatedAt: row!.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    const message =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
        ? `A form config with the key "${rawType}" already exists. Choose a different form key.`
        : error instanceof Error
          ? error.message
          : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
