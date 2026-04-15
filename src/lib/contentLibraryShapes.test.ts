import { describe, expect, it } from 'vitest'

import { normalizeIndustryMessaging, normalizeServiceProof } from '@/lib/contentLibraryShapes'

describe('content library shapes', () => {
  it('normalizes service proof into structured fields', () => {
    expect(
      normalizeServiceProof({
        bullets: [{ id: 'a', text: ' Clear messaging ' }, { text: '' }, null],
        imageMediaId: 12,
        imageUrl: ' /demo/services/visual.png ',
        imageAlt: ' Service visual ',
        ctaLabel: ' Learn more ',
        ctaHref: ' /contact ',
      }),
    ).toEqual({
      bullets: [{ id: 'a', text: 'Clear messaging' }],
      imageMediaId: 12,
      imageUrl: '/demo/services/visual.png',
      imageAlt: 'Service visual',
      ctaLabel: 'Learn more',
      ctaHref: '/contact',
    })
  })

  it('normalizes industry messaging into structured fields', () => {
    expect(
      normalizeIndustryMessaging({
        positioning: ' Proof first',
        challenges: ['Long sales cycles ', '', 42],
        opportunities: [' Better demos'],
        imageMediaId: 8,
        imageUrl: ' /demo/industries/visual.png ',
        imageAlt: ' Industry visual ',
        ctaLabel: 'Talk',
        ctaHref: '/contact ',
      }),
    ).toEqual({
      positioning: 'Proof first',
      challenges: ['Long sales cycles'],
      opportunities: ['Better demos'],
      imageMediaId: 8,
      imageUrl: '/demo/industries/visual.png',
      imageAlt: 'Industry visual',
      ctaLabel: 'Talk',
      ctaHref: '/contact',
    })
  })
})
