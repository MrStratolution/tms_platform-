import { describe, expect, it } from 'vitest'

import {
  resolveSectionSpacingStyle,
  resolveSectionWidthClass,
  sectionChromeFromBlock,
} from './resolveSectionPresentation'
import type { Page } from '@/types/cms'

function page(over: Partial<Page> = {}): Page {
  return {
    id: 1,
    title: 'P',
    slug: 'p',
    pageType: 'landing',
    status: 'published',
    updatedAt: '',
    createdAt: '',
    ...over,
  } as Page
}

describe('resolveSectionPresentation', () => {
  it('uses block spacing over page preset', () => {
    const p = page({ sectionSpacingPreset: 'compact' })
    const style = resolveSectionSpacingStyle(p, { sectionSpacingY: 'lg' })
    expect(style.paddingBlock).toContain('6rem')
  })

  it('maps page preset to spacing when block inherits', () => {
    const p = page({ sectionSpacingPreset: 'compact' })
    const style = resolveSectionSpacingStyle(p, {})
    expect(style.paddingBlock).toBeDefined()
  })

  it('uses block width over page max width', () => {
    const p = page({ maxWidthMode: 'narrow' })
    expect(resolveSectionWidthClass(p, { widthMode: 'full' })).toBe('tma-block-shell--full')
  })

  it('falls back to page max width', () => {
    const p = page({ maxWidthMode: 'full' })
    expect(resolveSectionWidthClass(p, {})).toBe('tma-block-shell--full')
  })

  it('parses chrome from raw block JSON', () => {
    const c = sectionChromeFromBlock({
      blockType: 'cta',
      anchorId: 'pricing',
      sectionSpacingY: 'sm',
      widthMode: 'narrow',
      customClass: 'my-band',
      sectionHidden: true,
    })
    expect(c.anchorId).toBe('pricing')
    expect(c.sectionSpacingY).toBe('sm')
    expect(c.widthMode).toBe('narrow')
    expect(c.customClass).toBe('my-band')
    expect(c.sectionHidden).toBe(true)
  })
})
