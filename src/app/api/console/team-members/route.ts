import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { z } from 'zod'

import { getCustomDb } from '@/db/client'
import { cmsTeamMembers } from '@/db/schema'
import { requireConsoleJsonAuth } from '@/lib/console/apiAuth'
import { isMissingDbRelationError, missingRelationJsonResponse } from '@/lib/db/errors'

const createSchema = z.object({
  name: z.string().min(1).max(300),
  role: z.string().min(1).max(300),
  bio: z.string().max(4000).optional(),
  photoMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  linkedinUrl: z.string().max(500).optional(),
  active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:read')
  if (!auth.ok) return auth.response

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  try {
    const rows = await db
      .select()
      .from(cmsTeamMembers)
      .orderBy(asc(cmsTeamMembers.sortOrder), asc(cmsTeamMembers.id))

    return NextResponse.json({
      ok: true,
      teamMembers: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}

export async function POST(request: Request) {
  const auth = await requireConsoleJsonAuth(request, 'content:write')
  if (!auth.ok) return auth.response

  let json: unknown
  try { json = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const now = new Date()
  try {
    const [row] = await db
      .insert(cmsTeamMembers)
      .values({
        name: parsed.data.name,
        role: parsed.data.role,
        bio: parsed.data.bio ?? null,
        photoMediaId: parsed.data.photoMediaId ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
        active: parsed.data.active ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      ok: true,
      teamMember: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
    })
  } catch (e) {
    if (isMissingDbRelationError(e)) return missingRelationJsonResponse()
    throw e
  }
}
