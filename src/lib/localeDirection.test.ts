import { describe, expect, it } from 'vitest'

import { isRtlLocale, resolvePublicHtmlLang } from './localeDirection'

describe('isRtlLocale', () => {
  it('returns true for common RTL primary language subtags', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('AR')).toBe(true)
    expect(isRtlLocale('ar-SA')).toBe(true)
    expect(isRtlLocale('he')).toBe(true)
    expect(isRtlLocale('fa')).toBe(true)
    expect(isRtlLocale('ur')).toBe(true)
  })

  it('returns false for LTR locales', () => {
    expect(isRtlLocale('en')).toBe(false)
    expect(isRtlLocale('de')).toBe(false)
    expect(isRtlLocale('en-GB')).toBe(false)
    expect(isRtlLocale('')).toBe(false)
    expect(isRtlLocale(null)).toBe(false)
  })
})

describe('resolvePublicHtmlLang', () => {
  it('prefers header over cookie', () => {
    expect(resolvePublicHtmlLang('en', 'de')).toBe('en')
  })

  it('falls back to cookie', () => {
    expect(resolvePublicHtmlLang(null, 'en')).toBe('en')
  })

  it('defaults to de when missing or invalid', () => {
    expect(resolvePublicHtmlLang(undefined, undefined)).toBe('de')
    expect(resolvePublicHtmlLang('notalang', null)).toBe('de')
    expect(resolvePublicHtmlLang('', '')).toBe('de')
  })
})
