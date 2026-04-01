import { DEFAULT_PUBLIC_LOCALE, normalizePublicLocale } from '@/lib/publicLocale'

/**
 * Public site language direction for `lang` / `dir` on `<html>`.
 * Aligns with locale-prefixed routes and the `tma_lang` cookie.
 */

const RTL_PRIMARY = new Set([
  'ar',
  'he',
  'iw',
  'fa',
  'ur',
  'ps',
  'sd',
  'dv',
  'yi',
  'ku',
  'ckb',
])

const LANG_TAG = /^[a-z]{2}(-[A-Za-z0-9]+)?$/i

export function isRtlLocale(locale: string | null | undefined): boolean {
  if (!locale || typeof locale !== 'string') return false
  const primary = locale.trim().split('-')[0]?.toLowerCase()
  if (!primary) return false
  return RTL_PRIMARY.has(primary)
}

/** BCP 47-style tag from middleware header or cookie; default `de`. */
export function resolvePublicHtmlLang(
  headerLang: string | null | undefined,
  cookieLang: string | null | undefined,
): string {
  const raw = headerLang?.trim() || cookieLang?.trim() || ''
  if (raw && LANG_TAG.test(raw)) return normalizePublicLocale(raw)
  return DEFAULT_PUBLIC_LOCALE
}
