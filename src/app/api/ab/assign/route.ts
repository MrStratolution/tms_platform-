import { and, eq, isNull, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cmsAbVariants } from '@/db/schema'
import { defaultAbCookieName } from '@/lib/abCookies'
import { getPublishedPageBySlug, tryGetCmsDb } from '@/lib/cmsData'

const bodySchema = z.object({
  pageSlug: z.string().min(1),
  experimentSlug: z.string().optional().default('default'),
})

type AbArm = {
  variantKey: 'a' | 'b'
  weight: number | null
  active: boolean
}

function pickWeighted(variants: AbArm[]): 'a' | 'b' {
  const active = variants.filter((v) => v.active !== false)
  const sum = active.reduce((s, v) => s + (typeof v.weight === 'number' ? v.weight : 50), 0)
  if (sum <= 0) {
    return active.some((v) => v.variantKey === 'b') ? 'b' : 'a'
  }
  let r = Math.random() * sum
  for (const v of active) {
    const w = typeof v.weight === 'number' ? v.weight : 50
    r -= w
    if (r <= 0) return v.variantKey === 'b' ? 'b' : 'a'
  }
  return active[0]?.variantKey === 'b' ? 'b' : 'a'
}

/**
 * Assign a traffic bucket for A/B tests (sets HttpOnly cookie). Call once per visitor from the client.
 */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_AB_ASSIGN_API !== '1') {
    return NextResponse.json({ error: 'A/B assign API is disabled' }, { status: 404 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { pageSlug, experimentSlug } = parsed.data

  const page = await getPublishedPageBySlug(db, pageSlug)
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const expClause =
    experimentSlug === 'default'
      ? or(
          eq(cmsAbVariants.experimentSlug, 'default'),
          isNull(cmsAbVariants.experimentSlug),
        )
      : eq(cmsAbVariants.experimentSlug, experimentSlug)

  const rows = await db
    .select()
    .from(cmsAbVariants)
    .where(
      and(
        eq(cmsAbVariants.pageId, page.id),
        eq(cmsAbVariants.active, true),
        expClause,
      ),
    )

  const docs: AbArm[] = rows.map((r) => ({
    variantKey: r.variantKey === 'b' ? 'b' : 'a',
    weight: r.weight,
    active: r.active,
  }))

  if (docs.length === 0) {
    return NextResponse.json({ error: 'No active experiment' }, { status: 404 })
  }

  const variant = pickWeighted(docs)
  const res = NextResponse.json({ ok: true, variant })
  res.cookies.set(defaultAbCookieName(pageSlug), variant, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
