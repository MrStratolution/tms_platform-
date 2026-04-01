import type { SiteSettingsDocument } from '@/lib/siteSettings'

/**
 * Build a `:root { ... }` block from global layout / typography tokens.
 * Safe for injection: values are trimmed strings only (no `</style>` etc. from schema limits).
 */
export function siteSettingsToRootCss(site: SiteSettingsDocument | null | undefined): string {
  if (!site) return ''
  const rules: string[] = []

  const max = site.layout?.maxContentWidth?.trim()
  if (max) rules.push(`--tma-max:${max};`)

  const gutter = site.layout?.containerPaddingX?.trim()
  if (gutter) rules.push(`--tma-gutter:${gutter};`)

  const secY = site.layout?.sectionPaddingY?.trim()
  if (secY) rules.push(`--tma-section-y:${secY};`)

  const radius = site.layout?.borderRadiusScale?.trim()
  if (radius) rules.push(`--tma-radius-scale:${radius};`)

  const displayFont = site.typography?.headingFontStack?.trim()
  if (displayFont) rules.push(`--font-display:${displayFont};`)

  const bodyFont = site.typography?.bodyFontStack?.trim()
  if (bodyFont) rules.push(`--font-body:${bodyFont};`)

  const colorMap: Record<string, string> = {
    primary: '--tma-color-primary',
    secondary: '--tma-color-secondary',
    accent: '--tma-color-accent',
    surfaceBg: '--tma-color-surface',
    textDefault: '--tma-color-text',
    success: '--tma-color-success',
    warning: '--tma-color-warning',
    error: '--tma-color-error',
  }
  if (site.colors) {
    for (const [key, varName] of Object.entries(colorMap)) {
      const val = (site.colors as Record<string, string | undefined>)[key]?.trim()
      if (val) rules.push(`${varName}:${val};`)
    }
  }

  if (rules.length === 0) return ''
  return `:root{${rules.join('')}}`
}
