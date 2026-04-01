/** Cookie bucket for A/B overlays (default experiment). Slug is CMS page slug (e.g. `home`). */
export function defaultAbCookieName(pageSlug: string): string {
  const safe = pageSlug.replace(/[^\w-]/g, '_')
  return `tma_ab_${safe}_default`
}
