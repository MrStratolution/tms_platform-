import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminUsers, getCustomDb } from '@/db'
import {
  CONSOLE_SESSION_COOKIE,
  CONSOLE_SESSION_MAX_AGE_SEC,
} from '@/lib/console/constants'
import { normalizeAdminUiLocale } from '@/lib/adminI18n'
import { signConsoleSessionToken } from '@/lib/console/jwt'
import { verifyConsoleSessionToken } from '@/lib/console/jwt'

export async function GET() {
  const token = (await cookies()).get(CONSOLE_SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ user: null })
  }
  const payload = await verifyConsoleSessionToken(token)
  if (!payload) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: { email: payload.email, role: payload.role, sub: payload.sub, uiLocale: payload.uiLocale },
  })
}

const patchSchema = z.object({
  uiLocale: z.enum(['de', 'en']),
})

export async function PATCH(request: Request) {
  const token = (await cookies()).get(CONSOLE_SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyConsoleSessionToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const db = getCustomDb()
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const nextLocale = normalizeAdminUiLocale(parsed.data.uiLocale)
  await db
    .update(adminUsers)
    .set({ uiLocale: nextLocale, updatedAt: new Date() })
    .where(eq(adminUsers.id, payload.sub))

  const refreshedToken = await signConsoleSessionToken(
    payload.sub,
    payload.email,
    payload.role,
    nextLocale,
  )

  const res = NextResponse.json({
    ok: true,
    user: { email: payload.email, role: payload.role, sub: payload.sub, uiLocale: nextLocale },
  })
  res.cookies.set(CONSOLE_SESSION_COOKIE, refreshedToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CONSOLE_SESSION_MAX_AGE_SEC,
  })
  return res
}
