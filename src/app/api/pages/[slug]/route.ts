import { NextResponse } from 'next/server'

import { tryGetCmsDb } from '@/lib/cmsData'
import { getPublishedPageBySlug, toPublicPageJson } from '@/lib/pages'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const page = await getPublishedPageBySlug(db, slug)
  if (!page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(toPublicPageJson(page))
}
