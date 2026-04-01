import { describe, expect, it } from 'vitest'

import {
  extractPageSurfaceFromDocument,
  mergePageSurfaceIntoDocument,
  type PageSurfaceFields,
} from './pageSurfaceMerge'

function emptySurface(over: Partial<PageSurfaceFields> = {}): PageSurfaceFields {
  return {
    heroHeadline: '',
    heroSubheadline: '',
    seoTitle: '',
    seoDescription: '',
    seoCanonicalUrl: '',
    seoOgImageUrl: '',
    navigationLabel: '',
    navigationHref: '',
    navOrder: '',
    heroInsertIndex: '',
    primaryCtaLabel: '',
    primaryCtaHref: '',
    pageTheme: 'inherit',
    maxWidthMode: 'inherit',
    sectionSpacingPreset: 'inherit',
    headerVariant: 'inherit',
    footerVariant: 'inherit',
    pageCustomCss: '',
    trackingGtm: '',
    trackingMetaPixel: '',
    trackingLinkedIn: '',
    ...over,
  }
}

describe('pageSurfaceMerge heroInsertIndex', () => {
  it('extracts heroInsertIndex from document', () => {
    const s = extractPageSurfaceFromDocument({ heroInsertIndex: 2, layout: [] })
    expect(s.heroInsertIndex).toBe('2')
  })

  it('merges positive heroInsertIndex onto document', () => {
    const out = mergePageSurfaceIntoDocument(
      { layout: [{ blockType: 'cta', label: 'x', href: '/' }] },
      emptySurface({ heroInsertIndex: '1' }),
    )
    expect(out.heroInsertIndex).toBe(1)
  })

  it('removes heroInsertIndex when 0 or empty', () => {
    const cleared = mergePageSurfaceIntoDocument(
      { heroInsertIndex: 3, layout: [] },
      emptySurface({ heroInsertIndex: '' }),
    )
    expect(cleared.heroInsertIndex).toBeUndefined()

    const zero = mergePageSurfaceIntoDocument(
      { heroInsertIndex: 3, layout: [] },
      emptySurface({ heroInsertIndex: '0' }),
    )
    expect(zero.heroInsertIndex).toBeUndefined()
  })
})

describe('pageSurfaceMerge appearance', () => {
  it('extracts and merges page theme and spacing preset', () => {
    const doc = {
      pageTheme: 'dark',
      sectionSpacingPreset: 'compact',
      maxWidthMode: 'narrow',
    }
    const s = extractPageSurfaceFromDocument(doc)
    expect(s.pageTheme).toBe('dark')
    expect(s.sectionSpacingPreset).toBe('compact')
    expect(s.maxWidthMode).toBe('narrow')

    const cleared = mergePageSurfaceIntoDocument(doc, emptySurface())
    expect(cleared.pageTheme).toBeUndefined()
    expect(cleared.sectionSpacingPreset).toBeUndefined()
    expect(cleared.maxWidthMode).toBeUndefined()
  })

  it('merges page custom CSS when non-empty', () => {
    const out = mergePageSurfaceIntoDocument(
      {},
      emptySurface({ pageCustomCss: ' .x { color: red } ' }),
    )
    expect(out.customCss).toBe('.x { color: red }')

    const stripped = mergePageSurfaceIntoDocument(
      { customCss: 'old' },
      emptySurface({ pageCustomCss: '' }),
    )
    expect(stripped.customCss).toBeUndefined()
  })

  it('merges tracking overrides', () => {
    const out = mergePageSurfaceIntoDocument(
      {},
      emptySurface({ trackingMetaPixel: '12345', trackingLinkedIn: '9876' }),
    )
    const t = out.trackingOverrides as Record<string, string> | undefined
    expect(t).toBeDefined()
    expect(t?.metaPixelId).toBe('12345')
    expect(t?.linkedInPartnerId).toBe('9876')
    expect(t?.gtmContainerId).toBeUndefined()
  })

  it('removes tracking overrides when all empty', () => {
    const out = mergePageSurfaceIntoDocument(
      { trackingOverrides: { metaPixelId: 'old' } },
      emptySurface(),
    )
    expect(out.trackingOverrides).toBeUndefined()
  })
})
