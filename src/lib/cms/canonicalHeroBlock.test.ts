import { describe, expect, it } from 'vitest'

import {
  canonicalizeHeroDocument,
  getFirstHeroBlockIndex,
  patchPrimaryHeroBlock,
} from '@/lib/cms/canonicalHeroBlock'
import type { Page } from '@/types/cms'

describe('canonicalizeHeroDocument', () => {
  it('converts a legacy page hero into a normal layout hero block', () => {
    const result = canonicalizeHeroDocument({
      hero: { headline: 'Legacy hero', subheadline: 'Intro copy' },
      primaryCta: { label: 'Book now', href: '/contact' },
      heroInsertIndex: 1,
      layout: [
        { blockType: 'textMedia', id: 'text-1', headline: 'Section one' },
        { blockType: 'stickyCta', id: 'sticky-1', label: 'Sticky', href: '/contact' },
      ],
    })

    expect(result.autoConvertedLegacyHero).toBe(true)
    expect(result.document.layout).toEqual([
      { blockType: 'textMedia', id: 'text-1', headline: 'Section one' },
      {
        blockType: 'hero',
        id: 'legacy-page-hero',
        headline: 'Legacy hero',
        subheadline: 'Intro copy',
        ctaLabel: 'Book now',
        ctaHref: '/contact',
      },
      { blockType: 'stickyCta', id: 'sticky-1', label: 'Sticky', href: '/contact' },
    ])
  })

  it('does not duplicate an existing hero block', () => {
    const result = canonicalizeHeroDocument({
      hero: { headline: 'Legacy hero' },
      layout: [{ blockType: 'hero', id: 'hero-1', headline: 'Canonical hero' }],
    })

    expect(result.autoConvertedLegacyHero).toBe(false)
    expect(result.document.layout).toEqual([
      { blockType: 'hero', id: 'hero-1', headline: 'Canonical hero' },
    ])
  })

  it('strips legacy hero fields when requested', () => {
    const result = canonicalizeHeroDocument(
      {
        hero: { headline: 'Legacy hero' },
        primaryCta: { label: 'Book', href: '/contact' },
        heroInsertIndex: 0,
      },
      { stripLegacyFields: true },
    )

    expect(result.document.hero).toBeUndefined()
    expect(result.document.primaryCta).toBeUndefined()
    expect(result.document.heroInsertIndex).toBeUndefined()
    expect(result.document.layout).toEqual([
      {
        blockType: 'hero',
        id: 'legacy-page-hero',
        headline: 'Legacy hero',
        ctaLabel: 'Book',
        ctaHref: '/contact',
      },
    ])
  })

  it('can apply localized legacy hero values onto an existing hero block', () => {
    const result = canonicalizeHeroDocument(
      {
        hero: { headline: 'English hero', subheadline: 'Localized copy' },
        primaryCta: { label: 'Book now', href: '/en/contact' },
        layout: [{ blockType: 'hero', id: 'hero-1', headline: 'Deutsch', ctaLabel: 'Buchen' }],
      },
      { preferLegacyValuesForExistingHero: true },
    )

    expect(result.document.layout).toEqual([
      {
        blockType: 'hero',
        id: 'hero-1',
        headline: 'English hero',
        subheadline: 'Localized copy',
        ctaLabel: 'Book now',
        ctaHref: '/en/contact',
      },
    ])
  })
})

describe('hero layout helpers', () => {
  it('finds and patches the first hero block', () => {
    const layout: NonNullable<Page['layout']> = [
      { blockType: 'hero', id: 'hero-1', headline: 'Alt' },
      { blockType: 'cta', id: 'cta-1', label: 'Go', href: '/' },
    ]

    expect(getFirstHeroBlockIndex(layout)).toBe(0)
    expect(patchPrimaryHeroBlock(layout, { headline: 'Updated', ctaLabel: 'Book' })).toEqual([
      { blockType: 'hero', id: 'hero-1', headline: 'Updated', ctaLabel: 'Book' },
      { blockType: 'cta', id: 'cta-1', label: 'Go', href: '/' },
    ])
  })
})
