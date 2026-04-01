/** Lowercase URL segment for marketing pages and products (no leading slash). */
export const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const RESERVED = new Set([
  'api',
  'console',
  '_next',
  'book',
  'products',
  'preview',
  'static',
  'icon',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
])

export function validatePageSlug(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = raw.trim().toLowerCase()
  if (!slug) return { ok: false, error: 'Slug is required' }
  if (slug.length > 200) return { ok: false, error: 'Slug must be at most 200 characters' }
  if (!PAGE_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: 'Use lowercase letters, numbers, and single hyphens between segments (e.g. my-landing-page)',
    }
  }
  if (RESERVED.has(slug)) return { ok: false, error: 'That slug is reserved for the platform' }
  return { ok: true, slug }
}
