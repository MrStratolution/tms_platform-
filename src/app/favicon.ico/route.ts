import { NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-static'

export async function GET() {
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
