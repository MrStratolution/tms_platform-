import { describe, expect, it } from 'vitest'

import { isNextLinkNavHref, normalizeNavHref } from '@/lib/cms/navHref'

describe('normalizeNavHref', () => {
  it('trims and normalizes relative paths', () => {
    expect(normalizeNavHref('  services  ')).toBe('/services')
    expect(normalizeNavHref('/contact')).toBe('/contact')
  })

  it('collapses duplicate slashes in paths', () => {
    expect(normalizeNavHref('//foo//bar')).toBe('/foo/bar')
  })

  it('preserves http(s) URLs', () => {
    expect(normalizeNavHref('https://example.com/x')).toBe('https://example.com/x')
    expect(normalizeNavHref('HTTP://EXAMPLE.COM/')).toBe('HTTP://EXAMPLE.COM/')
  })

  it('preserves mailto and tel', () => {
    expect(normalizeNavHref('mailto:hi@example.com')).toBe('mailto:hi@example.com')
    expect(normalizeNavHref('tel:+15551212')).toBe('tel:+15551212')
  })

  it('returns empty for blank', () => {
    expect(normalizeNavHref('')).toBe('')
    expect(normalizeNavHref('   ')).toBe('')
  })
})

describe('isNextLinkNavHref', () => {
  it('treats site paths as internal', () => {
    expect(isNextLinkNavHref('/book/strategy-call')).toBe(true)
    expect(isNextLinkNavHref('')).toBe(true)
  })

  it('treats absolute and special-scheme URLs as external for Link', () => {
    expect(isNextLinkNavHref('https://x.com')).toBe(false)
    expect(isNextLinkNavHref('mailto:a@b.co')).toBe(false)
    expect(isNextLinkNavHref('tel:1')).toBe(false)
  })
})
