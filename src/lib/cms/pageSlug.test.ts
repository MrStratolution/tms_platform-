import { describe, expect, it } from 'vitest'

import { PAGE_SLUG_PATTERN, validatePageSlug } from '@/lib/cms/pageSlug'

describe('validatePageSlug', () => {
  it('accepts valid slugs', () => {
    const a = validatePageSlug('my-page')
    expect(a.ok).toBe(true)
    if (a.ok) expect(a.slug).toBe('my-page')

    const b = validatePageSlug('  Ab-C  ')
    expect(b.ok).toBe(true)
    if (b.ok) expect(b.slug).toBe('ab-c')
  })

  it('rejects empty and invalid patterns', () => {
    expect(validatePageSlug('').ok).toBe(false)
    expect(validatePageSlug('Bad_Slug').ok).toBe(false)
    expect(validatePageSlug('-no').ok).toBe(false)
    expect(validatePageSlug('no-').ok).toBe(false)
  })

  it('rejects reserved slugs', () => {
    expect(validatePageSlug('api').ok).toBe(false)
    expect(validatePageSlug('console').ok).toBe(false)
    expect(validatePageSlug('products').ok).toBe(false)
    expect(validatePageSlug('preview').ok).toBe(false)
  })
})

describe('PAGE_SLUG_PATTERN', () => {
  it('matches single segment', () => {
    expect(PAGE_SLUG_PATTERN.test('a')).toBe(true)
    expect(PAGE_SLUG_PATTERN.test('ab12')).toBe(true)
  })
})
