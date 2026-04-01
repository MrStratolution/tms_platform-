/** Normalize YouTube / Vimeo / raw URLs for iframe `src`. */
export function toVideoEmbedUrl(raw: string): string {
  const u = raw.trim()
  if (!u) return u

  try {
    if (u.includes('youtube.com/embed/')) return u
    if (u.includes('youtube.com/watch')) {
      const url = new URL(u, 'https://www.youtube.com')
      const v = url.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (u.includes('youtu.be/')) {
      const path = u.split('youtu.be/')[1]?.split(/[?#&]/)[0]
      if (path) return `https://www.youtube.com/embed/${path}`
    }
    if (u.includes('vimeo.com/') && !u.includes('player.vimeo.com')) {
      const path = u.split('vimeo.com/')[1]?.split(/[?#]/)[0]
      const id = path?.replace(/^\/?/, '').split('/')[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
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
