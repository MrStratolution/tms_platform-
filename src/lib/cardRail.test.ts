import { describe, expect, it } from 'vitest'

import { shouldUseCardRail } from '@/lib/cardRail'

describe('shouldUseCardRail', () => {
  it('does not use a rail for a single item', () => {
    expect(shouldUseCardRail(1, 390)).toBe(false)
    expect(shouldUseCardRail(1, 1440)).toBe(false)
  })

  it('uses a rail on mobile when more than one card exists', () => {
    expect(shouldUseCardRail(2, 390)).toBe(true)
    expect(shouldUseCardRail(4, 430)).toBe(true)
  })

  it('uses a rail on tablet only when more than two cards exist', () => {
    expect(shouldUseCardRail(2, 768)).toBe(false)
    expect(shouldUseCardRail(3, 1024)).toBe(true)
  })

  it('uses a rail on desktop only when more than three cards exist', () => {
    expect(shouldUseCardRail(3, 1280)).toBe(false)
    expect(shouldUseCardRail(4, 1440)).toBe(true)
  })
})
