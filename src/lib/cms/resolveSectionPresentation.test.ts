import { describe, expect, it } from 'vitest'

import {
  resolveSectionSpacingStyle,
  resolveSectionWidthClass,
  sectionEffectsFromBlock,
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
    expect(style.paddingBlock).toContain('4.5rem')
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
      marginTop: '24px',
      paddingLeft: '2rem',
      marginUnit: 'px',
      paddingUnit: 'rem',
      sectionSpacingY: 'sm',
      widthMode: 'narrow',
      zIndex: 5,
      animationPreset: 'slide-blur',
      hoverPreset: 'glow',
      backgroundEffect: 'glass',
      heroEffect: 'rotating-text',
      revealMode: 'subtle',
      customClass: 'my-band',
      sectionHidden: true,
    })
    expect(c.anchorId).toBe('pricing')
    expect(c.marginTop).toBe('24px')
    expect(c.paddingLeft).toBe('2rem')
    expect(c.marginUnit).toBe('px')
    expect(c.paddingUnit).toBe('rem')
    expect(c.sectionSpacingY).toBe('sm')
    expect(c.widthMode).toBe('narrow')
    expect(c.zIndex).toBe(5)
    expect(c.animationPreset).toBe('slide-blur')
    expect(c.hoverPreset).toBe('glow')
    expect(c.backgroundEffect).toBe('glass')
    expect(c.heroEffect).toBe('rotating-text')
    expect(c.revealMode).toBe('subtle')
    expect(c.customClass).toBe('my-band')
    expect(c.sectionHidden).toBe(true)
  })

  it('maps phase-1 presets to resolved section effects', () => {
    const effects = sectionEffectsFromBlock({
      blockType: 'cta',
      animationPreset: 'scale-in',
      hoverPreset: 'lift',
      backgroundEffect: 'noise',
      heroEffect: 'none',
      revealDelay: 160,
    })
    expect(effects.animationPreset).toBe('scale-in')
    expect(effects.revealVariant).toBe('scale-in')
    expect(effects.hoverPreset).toBe('lift')
    expect(effects.backgroundEffect).toBe('noise')
    expect(effects.revealDelay).toBe(160)
  })

  it('keeps legacy revealMode compatibility when new preset is absent', () => {
    const effects = sectionEffectsFromBlock({
      blockType: 'imageBanner',
      revealMode: 'blur',
    })
    expect(effects.animationPreset).toBe('slide-blur')
    expect(effects.revealVariant).toBe('blur')
  })
})
