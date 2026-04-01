/** Normalize editor input for header `navigationHref` (paths or absolute URLs). */
export function normalizeNavHref(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (/^(mailto|tel):/i.test(t)) return t
  const path = t.startsWith('/') ? t : `/${t}`
  return path.replace(/\/{2,}/g, '/')
}

/** Use Next `<Link>` for in-app paths; use `<a>` for `http(s):`, `mailto:`, `tel:`, etc. */
export function isNextLinkNavHref(href: string): boolean {
  const t = href.trim()
  if (!t) return true
  if (/^https?:\/\//i.test(t)) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return false
  return true
}
