import { describe, expect, it } from 'vitest'

import { mergeLayoutBlockReference } from './hydratePageLayoutRelations'

describe('hydratePageLayoutRelations', () => {
  it('preserves advanced chrome overrides from layoutBlockRef wrappers', () => {
    const merged = mergeLayoutBlockReference(
      {
        blockType: 'textMedia',
        heading: 'Base',
        marginTop: '8px',
        paddingBottom: '24px',
      },
      {
        blockType: 'layoutBlockRef',
        id: 'linked-block-1',
        layoutBlockId: 42,
        marginTop: '32px',
        marginRight: '5%',
        marginBottom: '12px',
        marginLeft: '1rem',
        paddingTop: '16px',
        paddingRight: '20px',
        paddingBottom: '28px',
        paddingLeft: '2rem',
        marginUnit: 'px',
        paddingUnit: 'rem',
        widthMode: 'full',
        sectionSpacingY: 'sm',
        zIndex: 7,
        animationPreset: 'slide-up',
        customClass: 'test-shell',
      },
    )

    expect(merged.id).toBe('linked-block-1')
    expect(merged.marginTop).toBe('32px')
    expect(merged.marginRight).toBe('5%')
    expect(merged.marginBottom).toBe('12px')
    expect(merged.marginLeft).toBe('1rem')
    expect(merged.paddingTop).toBe('16px')
    expect(merged.paddingRight).toBe('20px')
    expect(merged.paddingBottom).toBe('28px')
    expect(merged.paddingLeft).toBe('2rem')
    expect(merged.marginUnit).toBe('px')
    expect(merged.paddingUnit).toBe('rem')
    expect(merged.widthMode).toBe('full')
    expect(merged.sectionSpacingY).toBe('sm')
    expect(merged.zIndex).toBe(7)
    expect(merged.animationPreset).toBe('slide-up')
    expect(merged.customClass).toBe('test-shell')
  })
})
