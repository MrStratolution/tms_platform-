import { siteSettingsToRootCss } from '@/lib/siteSettingsCssVars'
import { sanitizePageCustomCss } from '@/lib/cms/resolveSectionPresentation'
import type { SiteSettingsDocument } from '@/lib/siteSettings'

function sanitizeSiteCustomCss(css: string | null | undefined): string {
  return sanitizePageCustomCss(css ?? '')
}

type Props = {
  site: SiteSettingsDocument | null | undefined
}

/**
 * Injects global design tokens and optional site-wide custom CSS from settings.
 */
export function PublicThemeCss({ site }: Props) {
  const root = siteSettingsToRootCss(site ?? null)
  const custom = sanitizeSiteCustomCss(site?.customCss)
  if (!root && !custom) return null
  return (
    <>
      {root ? <style dangerouslySetInnerHTML={{ __html: root }} /> : null}
      {custom ? <style data-tma-site-css dangerouslySetInnerHTML={{ __html: custom }} /> : null}
    </>
  )
}
