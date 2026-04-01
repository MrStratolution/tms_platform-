export const PUBLIC_LOCALES = ['de', 'en'] as const

export type PublicLocale = (typeof PUBLIC_LOCALES)[number]

export const DEFAULT_PUBLIC_LOCALE: PublicLocale = 'de'

const NON_LOCALIZED_PUBLIC_PREFIXES = [
  '/console',
  '/api',
  '/_next',
  '/icon',
] as const

const NON_LOCALIZED_PUBLIC_EXACT_PATHS = [
  '/favicon.ico',
] as const

export function isSupportedPublicLocale(value: string | null | undefined): value is PublicLocale {
  return value === 'de' || value === 'en'
}

export function normalizePublicLocale(value: string | null | undefined): PublicLocale {
  const raw = value?.trim().toLowerCase() ?? ''
  if (!raw) return DEFAULT_PUBLIC_LOCALE
  const primary = raw.split('-')[0]
  return primary === 'en' ? 'en' : 'de'
}

export function stripLocalePrefix(pathname: string): {
  locale: PublicLocale | null
  pathnameWithoutLocale: string
} {
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0]?.toLowerCase()
  if (!isSupportedPublicLocale(first)) {
    return { locale: null, pathnameWithoutLocale: pathname || '/' }
  }
  const rest = parts.slice(1).join('/')
  return {
    locale: first,
    pathnameWithoutLocale: rest ? `/${rest}` : '/',
  }
}

export function withLocalePrefix(pathname: string, locale: PublicLocale): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`
  const { pathnameWithoutLocale } = stripLocalePrefix(clean)
  if (pathnameWithoutLocale === '/') return `/${locale}`
  return `/${locale}${pathnameWithoutLocale}`
}

export function isNonLocalizedPublicPath(pathname: string): boolean {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (NON_LOCALIZED_PUBLIC_EXACT_PATHS.includes(clean as (typeof NON_LOCALIZED_PUBLIC_EXACT_PATHS)[number])) {
    return true
  }
  return NON_LOCALIZED_PUBLIC_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  )
}

export function localizePublicHref(
  href: string,
  locale: PublicLocale,
): string {
  if (!href.startsWith('/')) return href
  if (isNonLocalizedPublicPath(href)) {
    return href
  }
  return withLocalePrefix(href, locale)
}

export function localePathForPageSlug(
  slug: string,
  locale: PublicLocale,
): string {
  return slug === 'home' ? `/${locale}` : `/${locale}/${slug}`
}
