import { NextResponse } from 'next/server'

import { getPreviewPageBySlug, tryGetCmsDb } from '@/lib/cmsData'
import { toPublicPageJson } from '@/lib/pages'

/**
 * Draft preview — pass `x-tma-preview-secret` or `?secret=` matching INTERNAL_PREVIEW_SECRET.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const secret = process.env.INTERNAL_PREVIEW_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Preview is not configured' }, { status: 503 })
  }

  const url = new URL(request.url)
  const provided =
    request.headers.get('x-tma-preview-secret') ?? url.searchParams.get('secret') ?? ''
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cms = tryGetCmsDb()
  if (!cms.ok) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }
  const { db } = cms

  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const page = await getPreviewPageBySlug(db, slug)
  if (!page) {
    return NextResponse.json(
      { error: 'No page with this slug, or it is in trash.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    preview: true,
    ...toPublicPageJson(page),
  })
}
