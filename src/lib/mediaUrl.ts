import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'

/**
 * Turn CMS media `url` (often relative, e.g. `/brand/...`) into an absolute URL for `<img src>`.
 */
export function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = getPublicSiteOrigin()
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}
