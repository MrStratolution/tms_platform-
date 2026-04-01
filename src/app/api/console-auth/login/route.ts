import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { adminUsers, getCustomDb } from '@/db'
import {
  CONSOLE_SESSION_COOKIE,
  CONSOLE_SESSION_MAX_AGE_SEC,
} from '@/lib/console/constants'
import { signConsoleSessionToken } from '@/lib/console/jwt'
import { verifyPassword } from '@/lib/console/password'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rateLimit'

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(500),
})

export async function POST(request: Request) {
  const db = getCustomDb()
  if (!db) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }

  const ip = clientIpFromRequest(request)
  const loginLimit = await checkRateLimit(
    `console-login:${ip}`,
    Number(process.env.CONSOLE_LOGIN_RATE_LIMIT_MAX) || 20,
    Number(process.env.CONSOLE_LOGIN_RATE_LIMIT_WINDOW_MS) || 900_000,
  )
  if (!loginLimit.ok) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(loginLimit.retryAfterSec ?? 60) },
      },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()

  let token: string
  try {
    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)
    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    token = await signConsoleSessionToken(user.id, user.email, user.role, user.uiLocale)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('ADMIN_SESSION_SECRET')) {
      return NextResponse.json(
        { error: 'Server is not configured for console sign-in' },
        { status: 503 },
      )
    }
    throw e
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CONSOLE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CONSOLE_SESSION_MAX_AGE_SEC,
  })
  return res
}
