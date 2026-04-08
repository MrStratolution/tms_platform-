import { describe, expect, it } from 'vitest'

import {
  extractPageSurfaceFromDocument,
  mergePageSurfaceIntoDocument,
  type PageSurfaceFields,
} from './pageSurfaceMerge'

function emptySurface(over: Partial<PageSurfaceFields> = {}): PageSurfaceFields {
  return {
    seoTitle: '',
    seoDescription: '',
    seoCanonicalUrl: '',
    seoOgImageUrl: '',
    navigationLabel: '',
    navigationHref: '',
    navOrder: '',
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

describe('pageSurfaceMerge legacy hero cleanup', () => {
  it('removes legacy hero fields while preserving layout blocks', () => {
    const out = mergePageSurfaceIntoDocument(
      {
        hero: { headline: 'Legacy' },
        primaryCta: { label: 'Book', href: '/book' },
        heroInsertIndex: 2,
        layout: [{ blockType: 'hero', id: 'hero-1', headline: 'Canonical' }],
      },
      emptySurface(),
    )
    expect(out.hero).toBeUndefined()
    expect(out.primaryCta).toBeUndefined()
    expect(out.heroInsertIndex).toBeUndefined()
    expect(out.layout).toEqual([{ blockType: 'hero', id: 'hero-1', headline: 'Canonical' }])
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
