type VideoEmbedOptions = {
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
}

function applyProviderOptions(base: string, provider: 'youtube' | 'vimeo', options?: VideoEmbedOptions): string {
  if (!options) return base
  try {
    const url = new URL(base)
    const autoplay = options.autoplay === true
    const muted = options.muted !== false
    const loop = options.loop === true
    const controls = options.controls !== false

    if (provider === 'youtube') {
      if (autoplay) url.searchParams.set('autoplay', '1')
      if (muted) url.searchParams.set('mute', '1')
      if (loop) {
        url.searchParams.set('loop', '1')
        const videoId = url.pathname.split('/').filter(Boolean).pop()
        if (videoId) url.searchParams.set('playlist', videoId)
      }
      if (!controls) url.searchParams.set('controls', '0')
      url.searchParams.set('playsinline', '1')
      return url.toString()
    }

    if (autoplay) url.searchParams.set('autoplay', '1')
    if (muted) url.searchParams.set('muted', '1')
    if (loop) url.searchParams.set('loop', '1')
    if (!controls) url.searchParams.set('controls', '0')
    return url.toString()
  } catch {
    return base
  }
}

/** Normalize YouTube / Vimeo / raw URLs for iframe `src`. */
export function toVideoEmbedUrl(raw: string, options?: VideoEmbedOptions): string {
  const u = raw.trim()
  if (!u) return u

  try {
    if (u.includes('youtube.com/embed/')) return applyProviderOptions(u, 'youtube', options)
    if (u.includes('youtube.com/watch')) {
      const url = new URL(u, 'https://www.youtube.com')
      const v = url.searchParams.get('v')
      if (v) return applyProviderOptions(`https://www.youtube.com/embed/${v}`, 'youtube', options)
    }
    if (u.includes('youtu.be/')) {
      const path = u.split('youtu.be/')[1]?.split(/[?#&]/)[0]
      if (path) return applyProviderOptions(`https://www.youtube.com/embed/${path}`, 'youtube', options)
    }
    if (u.includes('vimeo.com/') && !u.includes('player.vimeo.com')) {
      const path = u.split('vimeo.com/')[1]?.split(/[?#]/)[0]
      const id = path?.replace(/^\/?/, '').split('/')[0]
      if (id && /^\d+$/.test(id)) return applyProviderOptions(`https://player.vimeo.com/video/${id}`, 'vimeo', options)
    }
  } catch {
    /* keep original */
  }

  return u
}

export function isLikelyEmbeddableVideoUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const allowed = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com']
    return allowed.some(h => hostname === h || hostname.endsWith('.' + h))
  } catch {
    return false
  }
}
