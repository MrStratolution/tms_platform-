import { describe, expect, it } from 'vitest'

import { buildCmsNavEntries, getManualNavLinksFromSiteSettings } from '@/lib/cms/publicNavLinks'

describe('buildCmsNavEntries', () => {
  it('skips home and rows without navigationLabel', () => {
    expect(
      buildCmsNavEntries([
        { slug: 'home', document: { navigationLabel: 'Home' } },
        { slug: 'x', document: {} },
      ]),
    ).toEqual([])
  })

  it('uses slug path when navigationHref is absent', () => {
    const out = buildCmsNavEntries([
      { slug: 'services', document: { navigationLabel: 'Services', navOrder: 10 } },
    ])
    expect(out).toEqual([{ href: '/services', label: 'Services' }])
  })

  it('normalizes navigationHref override', () => {
    const out = buildCmsNavEntries([
      {
        slug: 'book-call',
        document: {
          navigationLabel: 'Book',
          navigationHref: 'book/strategy-call',
          navOrder: 5,
        },
      },
    ])
    expect(out).toEqual([{ href: '/book/strategy-call', label: 'Book' }])
  })

  it('sorts by navOrder then label', () => {
    const out = buildCmsNavEntries([
      { slug: 'b', document: { navigationLabel: 'B', navOrder: 20 } },
      { slug: 'a', document: { navigationLabel: 'A', navOrder: 10 } },
      { slug: 'c', document: { navigationLabel: 'C' } },
    ])
    expect(out.map((x) => x.label)).toEqual(['A', 'B', 'C'])
  })

  it('dedupes by href keeping first after sort', () => {
    const out = buildCmsNavEntries([
      { slug: 'first', document: { navigationLabel: 'First', navigationHref: '/x', navOrder: 1 } },
      { slug: 'second', document: { navigationLabel: 'Second', navigationHref: '/x', navOrder: 2 } },
    ])
    expect(out).toEqual([{ href: '/x', label: 'First' }])
  })

  it('builds locale-aware manual nav from site settings', () => {
    const out = getManualNavLinksFromSiteSettings(
      {
        header: {
          navigationItems: [
            {
              id: 'nav-1',
              type: 'product',
              href: 'products/growth-engine',
              label: 'Wachstum',
              labelEn: 'Growth',
              badge: 'Neu',
              badgeEn: 'New',
              newTab: false,
              showOnDesktop: true,
              showOnMobile: false,
            },
          ],
        },
      },
      'en',
    )

    expect(out).toEqual([
      {
        href: '/products/growth-engine',
        label: 'Growth',
        badge: 'New',
        newTab: false,
        showOnDesktop: true,
        showOnMobile: false,
      },
    ])
  })
})
