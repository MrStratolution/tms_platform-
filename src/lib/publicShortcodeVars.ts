import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'
import { loadSiteSettingsForPublic } from '@/lib/siteSettings'

/**
 * Values for allowlisted rich-text tokens such as `{{site_name}}`, `{{contact_email}}`.
 * Resolved server-side from global site settings — safe for public render.
 */
export async function getPublicShortcodeVars(): Promise<Record<string, string>> {
  const site = await loadSiteSettingsForPublic()
  return {
    site_name: site?.branding?.siteName?.trim() || 'The Modesty Argument',
    contact_email: site?.contactInfo?.email?.trim() || '',
    contact_phone: site?.contactInfo?.phone?.trim() || '',
    company_name: site?.contactInfo?.companyName?.trim() || site?.branding?.siteName?.trim() || '',
    site_url: getPublicSiteOrigin(),
  }
}
