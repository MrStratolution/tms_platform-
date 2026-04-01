import { describe, expect, it } from 'vitest'

import { validateTranslatedLayout } from './layoutTranslationGuard'

describe('validateTranslatedLayout', () => {
  it('accepts matching block types and length', () => {
    const src = [{ blockType: 'cta', label: 'Go' }]
    const tr = [{ blockType: 'cta', label: 'Los' }]
    expect(validateTranslatedLayout(src, tr)).toEqual(tr)
  })

  it('rejects length mismatch', () => {
    expect(() => validateTranslatedLayout([{ blockType: 'a' }], [])).toThrow(/length mismatch/)
  })

  it('rejects blockType mismatch', () => {
    expect(() =>
      validateTranslatedLayout([{ blockType: 'cta' }], [{ blockType: 'faq' }]),
    ).toThrow(/blockType mismatch/)
  })
})
