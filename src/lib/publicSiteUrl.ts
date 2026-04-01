/**
 * Canonical site origin for links, sitemap, and previews.
 * No trailing slash. Must match the browser (scheme + host + port).
 *
 * Local default **4069** matches `npm run dev` in this repo; override with `NEXT_PUBLIC_SERVER_URL`.
 */
export function getPublicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SERVER_URL?.trim() || 'http://localhost:4069'
  return raw.replace(/\/$/, '')
}
