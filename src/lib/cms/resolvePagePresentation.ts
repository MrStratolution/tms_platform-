import type { SiteSettingsDocument } from '@/lib/siteSettings'
import type { Page } from '@/types/cms'

/**
 * Resolved page presentation: global defaults merged with page-level overrides.
 * Used by public renderers to determine theme, width, tracking, etc.
 */
export interface ResolvedPagePresentation {
  theme: 'default' | 'dark' | 'light'
  maxWidth: 'default' | 'narrow' | 'full'
  sectionSpacing: 'compact' | 'default' | 'comfortable' | 'spacious'
  headerVariant: 'default' | 'minimal'
  footerVariant: 'default' | 'minimal'
  gtmContainerId: string | null
  metaPixelId: string | null
  linkedInPartnerId: string | null
  pageCss: string | null
}

function pick<T extends string>(
  pageVal: string | null | undefined,
  fallback: T,
  allowed: readonly T[],
): T {
  if (
    typeof pageVal === 'string' &&
    pageVal !== 'inherit' &&
    (allowed as readonly string[]).includes(pageVal)
  ) {
    return pageVal as T
  }
  return fallback
}

export function resolvePagePresentation(
  page: Page,
  site: SiteSettingsDocument | null | undefined,
): ResolvedPagePresentation {
  const theme = pick(page.pageTheme, 'default', ['default', 'dark', 'light'] as const)
  const maxWidth = pick(page.maxWidthMode, 'default', ['default', 'narrow', 'full'] as const)
  const sectionSpacing = pick(page.sectionSpacingPreset, 'default', [
    'compact',
    'default',
    'comfortable',
    'spacious',
  ] as const)
  const headerVariant = pick(page.headerVariant, 'default', ['default', 'minimal'] as const)
  const footerVariant = pick(page.footerVariant, 'default', ['default', 'minimal'] as const)

  const pageTracking = page.trackingOverrides
  const gtmContainerId =
    pageTracking?.gtmContainerId?.trim() || site?.gtmContainerId?.trim() || null
  const metaPixelId = pageTracking?.metaPixelId?.trim() || null
  const linkedInPartnerId = pageTracking?.linkedInPartnerId?.trim() || null

  const pageCss = page.customCss?.trim() || null

  return {
    theme,
    maxWidth,
    sectionSpacing,
    headerVariant,
    footerVariant,
    gtmContainerId,
    metaPixelId,
    linkedInPartnerId,
    pageCss,
  }
}
