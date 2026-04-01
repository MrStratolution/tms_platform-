import { describe, expect, it } from 'vitest'

import { resolvePagePresentation } from './resolvePagePresentation'
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

describe('resolvePagePresentation', () => {
  it('defaults all fields when page has no overrides', () => {
    const r = resolvePagePresentation(page(), null)
    expect(r.theme).toBe('default')
    expect(r.maxWidth).toBe('default')
    expect(r.sectionSpacing).toBe('default')
    expect(r.headerVariant).toBe('default')
    expect(r.footerVariant).toBe('default')
    expect(r.gtmContainerId).toBeNull()
    expect(r.metaPixelId).toBeNull()
    expect(r.pageCss).toBeNull()
  })

  it('picks page overrides over defaults', () => {
    const r = resolvePagePresentation(
      page({ pageTheme: 'dark', maxWidthMode: 'narrow', sectionSpacingPreset: 'spacious' }),
      null,
    )
    expect(r.theme).toBe('dark')
    expect(r.maxWidth).toBe('narrow')
    expect(r.sectionSpacing).toBe('spacious')
  })

  it('ignores inherit values', () => {
    const r = resolvePagePresentation(page({ pageTheme: 'inherit' }), null)
    expect(r.theme).toBe('default')
  })

  it('prefers page GTM override, falls back to global', () => {
    const r = resolvePagePresentation(
      page({ trackingOverrides: { gtmContainerId: 'GTM-PAGE' } }),
      { gtmContainerId: 'GTM-GLOBAL' },
    )
    expect(r.gtmContainerId).toBe('GTM-PAGE')
  })

  it('falls back to global GTM when page has no override', () => {
    const r = resolvePagePresentation(page(), { gtmContainerId: 'GTM-GLOBAL' })
    expect(r.gtmContainerId).toBe('GTM-GLOBAL')
  })

  it('extracts meta pixel from page tracking', () => {
    const r = resolvePagePresentation(
      page({ trackingOverrides: { metaPixelId: '12345' } }),
      null,
    )
    expect(r.metaPixelId).toBe('12345')
    expect(r.linkedInPartnerId).toBeNull()
  })
})
