import { describe, expect, it } from 'vitest'

import { isLikelyEmbeddableVideoUrl, toVideoEmbedUrl } from '@/lib/videoEmbed'

describe('toVideoEmbedUrl', () => {
  it('converts YouTube watch URLs', () => {
    expect(toVideoEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube.com/embed/abc123',
    )
  })

  it('converts youtu.be links', () => {
    expect(toVideoEmbedUrl('https://youtu.be/xyz789')).toBe('https://www.youtube.com/embed/xyz789')
  })

  it('passes through existing embed URLs', () => {
    const u = 'https://www.youtube.com/embed/abc123'
    expect(toVideoEmbedUrl(u)).toBe(u)
  })

  it('applies playback options for youtube embeds', () => {
    expect(
      toVideoEmbedUrl('https://www.youtube.com/watch?v=abc123', {
        autoplay: true,
        muted: true,
        loop: true,
        controls: false,
      }),
    ).toBe(
      'https://www.youtube.com/embed/abc123?autoplay=1&mute=1&loop=1&playlist=abc123&controls=0&playsinline=1',
    )
  })

  it('applies playback options for vimeo embeds', () => {
    expect(
      toVideoEmbedUrl('https://vimeo.com/12345', {
        autoplay: true,
        muted: true,
        loop: true,
        controls: false,
      }),
    ).toBe('https://player.vimeo.com/video/12345?autoplay=1&muted=1&loop=1&controls=0')
  })
})

describe('isLikelyEmbeddableVideoUrl', () => {
  it('detects common hosts', () => {
    expect(isLikelyEmbeddableVideoUrl('https://youtube.com/watch?v=1')).toBe(true)
    expect(isLikelyEmbeddableVideoUrl('https://vimeo.com/12345')).toBe(true)
    expect(isLikelyEmbeddableVideoUrl('https://example.com/video.mp4')).toBe(false)
  })
})
