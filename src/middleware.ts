import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { defaultAbCookieName } from '@/lib/abCookies'
import { CONSOLE_SESSION_COOKIE } from '@/lib/console/constants'
import { verifyConsoleSessionToken } from '@/lib/console/jwt'
import {
  DEFAULT_PUBLIC_LOCALE,
  isNonLocalizedPublicPath,
  isSupportedPublicLocale,
  normalizePublicLocale,
  stripLocalePrefix,
  withLocalePrefix,
} from '@/lib/publicLocale'

function pageSlugFromPath(pathname: string): string {
  const { pathnameWithoutLocale } = stripLocalePrefix(pathname)
  if (pathnameWithoutLocale === '/' || pathnameWithoutLocale === '') return 'home'
  return pathnameWithoutLocale.split('/').filter(Boolean)[0] || 'home'
}

function validPublicLangTag(s: string | null | undefined): s is string {
  return !!s && /^[a-z]{2}(-[A-Za-z0-9]+)?$/i.test(s)
}

function isLocaleAwarePublicPath(pathname: string): boolean {
  if (isNonLocalizedPublicPath(pathname)) return false
  return (
    pathname === '/' ||
    /^\/(products|preview|book)(\/|$)/.test(pathname) ||
    /^\/[a-z0-9-]+$/.test(pathname)
  )
}

/**
 * Custom admin (`/console`): JWT cookie gate.
 * Also enforces canonical locale-prefixed public routes and persists `?tma_variant=a|b`.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const { locale: localeFromPath, pathnameWithoutLocale } = stripLocalePrefix(pathname)

  if (localeFromPath !== null && isNonLocalizedPublicPath(pathnameWithoutLocale)) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = pathnameWithoutLocale
    nextUrl.searchParams.delete('lang')
    return NextResponse.redirect(nextUrl)
  }

  if (pathnameWithoutLocale.startsWith('/console')) {
    const token = request.cookies.get(CONSOLE_SESSION_COOKIE)?.value
    const session = token ? await verifyConsoleSessionToken(token) : null
    const ok = !!session
    const isLogin =
      pathnameWithoutLocale === '/console/login' ||
      pathnameWithoutLocale.startsWith('/console/login/')
    if (isLogin) {
      if (ok) {
        return NextResponse.redirect(new URL('/console', request.url))
      }
    } else if (!ok) {
      return NextResponse.redirect(new URL('/console/login', request.url))
    }

    return NextResponse.next()
  }

  const langParam = request.nextUrl.searchParams.get('lang')
  const cookieLang = request.cookies.get('tma_lang')?.value
  const preferredLocale = validPublicLangTag(langParam)
    ? normalizePublicLocale(langParam)
    : validPublicLangTag(cookieLang)
      ? normalizePublicLocale(cookieLang)
      : DEFAULT_PUBLIC_LOCALE

  const localeAwarePath =
    localeFromPath !== null || isLocaleAwarePublicPath(pathnameWithoutLocale)

  if (localeAwarePath) {
    const targetLocale = localeFromPath ?? preferredLocale
    const shouldRedirect =
      localeFromPath === null || (validPublicLangTag(langParam) && normalizePublicLocale(langParam) !== localeFromPath)

    if (shouldRedirect) {
      const nextUrl = request.nextUrl.clone()
      nextUrl.pathname = withLocalePrefix(pathname, targetLocale)
      nextUrl.searchParams.delete('lang')

      const redirect = NextResponse.redirect(nextUrl)
      redirect.cookies.set('tma_lang', targetLocale, {
        maxAge: 60 * 60 * 24 * 180,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })

      const v = request.nextUrl.searchParams.get('tma_variant')
      if (v === 'a' || v === 'b') {
        redirect.cookies.set(defaultAbCookieName(pageSlugFromPath(nextUrl.pathname)), v, {
          maxAge: 60 * 60 * 24 * 90,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      }

      return redirect
    }
  }

  const activeLang = localeFromPath ?? preferredLocale

  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-tma-active-lang')
  if (isSupportedPublicLocale(activeLang)) {
    requestHeaders.set('x-tma-active-lang', activeLang)
  }

  const v = request.nextUrl.searchParams.get('tma_variant')
  const slug = pageSlugFromPath(request.nextUrl.pathname)
  const hasAb = v === 'a' || v === 'b'

  if (!hasAb) {
    return activeLang
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.next()
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  if (hasAb) {
    res.cookies.set(defaultAbCookieName(slug), v, {
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }
  res.cookies.set('tma_lang', activeLang, {
    maxAge: 60 * 60 * 24 * 180,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}

export const config = {
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
