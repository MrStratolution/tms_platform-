import { describe, expect, it } from 'vitest'

import {
  productHasLocaleCoverage,
  resolveProductFeedProducts,
  resolveProductFeedSelectionMode,
} from '@/lib/productFeeds'
import type { Page, Product } from '@/types/cms'

type ProductFeedBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'productFeed' }>

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'slug' | 'name'>): Product {
  return {
    id: overrides.id,
    slug: overrides.slug,
    name: overrides.name,
    status: overrides.status ?? 'published',
    contentKind: overrides.contentKind ?? 'product',
    publishedAt: overrides.publishedAt ?? null,
    listingPriority: overrides.listingPriority ?? null,
    showInProjectFeeds: overrides.showInProjectFeeds ?? false,
    document: overrides.document ?? {},
    updatedAt: overrides.updatedAt ?? '2026-04-08T09:00:00.000Z',
    createdAt: overrides.createdAt ?? '2026-04-01T09:00:00.000Z',
  }
}

describe('product feed helpers', () => {
  it('maps legacy automatic blocks when showAllPublished is true and no manual rows exist', () => {
    expect(
      resolveProductFeedSelectionMode({
        blockType: 'productFeed',
        showAllPublished: true,
      } as ProductFeedBlock),
    ).toBe('automatic')
  })

  it('keeps legacy blocks with manual rows in manual mode', () => {
    expect(
      resolveProductFeedSelectionMode({
        blockType: 'productFeed',
        showAllPublished: true,
        products: [1],
      } as ProductFeedBlock),
    ).toBe('manual')
  })

  it('filters automatic EN feeds to entries with EN localization only', () => {
    const withEn = product({
      id: 1,
      slug: 'with-en',
      name: 'With EN',
      contentKind: 'project',
      showInProjectFeeds: true,
      document: {
        localizations: {
          en: { summary: 'Localized' },
        },
      },
    })
    const withoutEn = product({
      id: 2,
      slug: 'without-en',
      name: 'Without EN',
      contentKind: 'project',
      showInProjectFeeds: true,
    })

    const result = resolveProductFeedProducts(
      {
        blockType: 'productFeed',
        selectionMode: 'automatic',
        showOnlyProjectFeedEligible: true,
      } as ProductFeedBlock,
      [],
      [withEn, withoutEn],
      'en',
    )

    expect(result.map((item) => item.slug)).toEqual(['with-en'])
    expect(productHasLocaleCoverage(withEn, 'en')).toBe(true)
    expect(productHasLocaleCoverage(withoutEn, 'en')).toBe(false)
  })

  it('fills hybrid feeds with sorted automatic results after manual items', () => {
    const manual = product({
      id: 1,
      slug: 'manual-entry',
      name: 'Manual entry',
      contentKind: 'project',
      showInProjectFeeds: true,
      listingPriority: 50,
      document: { localizations: { en: { summary: 'Manual' } } },
    })
    const autoA = product({
      id: 2,
      slug: 'auto-a',
      name: 'Auto A',
      contentKind: 'initiative',
      showInProjectFeeds: true,
      listingPriority: 10,
      document: { localizations: { en: { summary: 'A' } } },
    })
    const autoB = product({
      id: 3,
      slug: 'auto-b',
      name: 'Auto B',
      contentKind: 'system',
      showInProjectFeeds: true,
      listingPriority: 20,
      document: { localizations: { en: { summary: 'B' } } },
    })

    const result = resolveProductFeedProducts(
      {
        blockType: 'productFeed',
        selectionMode: 'hybrid',
        sortBy: 'listingPriority',
        sortDirection: 'asc',
        showOnlyProjectFeedEligible: true,
        featuredProduct: 2,
      } as ProductFeedBlock,
      [manual],
      [manual, autoA, autoB],
      'en',
    )

    expect(result.map((item) => item.slug)).toEqual(['manual-entry', 'auto-b'])
  })
})
