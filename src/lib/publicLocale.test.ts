import { describe, expect, it } from 'vitest'

import {
  isNonLocalizedPublicPath,
  localizePublicHref,
  stripLocalePrefix,
  withLocalePrefix,
} from './publicLocale'

describe('isNonLocalizedPublicPath', () => {
  it('treats console and internal app prefixes as non-localized', () => {
    expect(isNonLocalizedPublicPath('/console')).toBe(true)
    expect(isNonLocalizedPublicPath('/console/login')).toBe(true)
    expect(isNonLocalizedPublicPath('/api/console/pages')).toBe(true)
    expect(isNonLocalizedPublicPath('/_next/static/chunk.js')).toBe(true)
  })

  it('leaves public website routes localizable', () => {
    expect(isNonLocalizedPublicPath('/')).toBe(false)
    expect(isNonLocalizedPublicPath('/services')).toBe(false)
    expect(isNonLocalizedPublicPath('/products/ai-audit')).toBe(false)
  })
})

describe('localizePublicHref', () => {
  it('does not localize admin URLs', () => {
    expect(localizePublicHref('/console', 'de')).toBe('/console')
    expect(localizePublicHref('/console/login', 'en')).toBe('/console/login')
  })

  it('localizes public URLs', () => {
    expect(localizePublicHref('/services', 'de')).toBe('/de/services')
    expect(localizePublicHref('/en/contact', 'de')).toBe('/de/contact')
  })
})

describe('stripLocalePrefix and withLocalePrefix', () => {
  it('keeps internal paths recognizable after stripping', () => {
    expect(stripLocalePrefix('/de/console')).toEqual({
      locale: 'de',
      pathnameWithoutLocale: '/console',
    })
  })

  it('adds locale prefixes only to public paths', () => {
    expect(withLocalePrefix('/services', 'en')).toBe('/en/services')
  })
})
