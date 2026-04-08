import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { loadSiteSettingsForPublic } from '@/lib/siteSettings'

/** PNG favicon — avoids Satori/ImageResponse 500s from unsupported CSS in dev. */
export const dynamic = 'force-dynamic'

export async function GET() {
  const site = await loadSiteSettingsForPublic()
  const faviconUrl = site?.branding?.faviconUrl?.trim()
  const faviconAbs = faviconUrl ? absoluteMediaUrl(faviconUrl) : null

  if (faviconAbs) {
    return NextResponse.redirect(faviconAbs, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  const buf = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 231, g: 248, b: 200 },
    },
  })
    .png()
    .toBuffer()

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
