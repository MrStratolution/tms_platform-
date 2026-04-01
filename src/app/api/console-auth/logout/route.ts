import { NextResponse } from 'next/server'

import { CONSOLE_SESSION_COOKIE } from '@/lib/console/constants'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CONSOLE_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}
