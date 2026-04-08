import type { PublicLocale } from '@/lib/publicLocale'
import type { SiteSettingsDocument } from '@/lib/siteSettings'

export const COOKIE_CONSENT_NAME = 'tma_cookie_consent'

export type CookieConsentValue = 'accepted' | 'rejected'

export function normalizeCookieConsentValue(
  value: string | null | undefined,
): CookieConsentValue | null {
  if (value === 'accepted' || value === 'rejected') return value
  return null
}

export function isAnalyticsAllowed(
  cookieValue: string | null | undefined,
  site: SiteSettingsDocument | null | undefined,
): boolean {
  if (site?.cookieConsent?.enabled !== true) return true
  return normalizeCookieConsentValue(cookieValue) === 'accepted'
}

export function shouldShowCookieBanner(
  cookieValue: string | null | undefined,
  site: SiteSettingsDocument | null | undefined,
): boolean {
  if (site?.cookieConsent?.enabled !== true) return false
  return normalizeCookieConsentValue(cookieValue) === null
}

export function localizedCookieConsentCopy(
  site: SiteSettingsDocument | null | undefined,
  locale: PublicLocale,
) {
  const settings = site?.cookieConsent
  return {
    title:
      locale === 'en'
        ? settings?.titleEn?.trim() || settings?.title?.trim() || 'Cookies and privacy'
        : settings?.title?.trim() || 'Cookies und Datenschutz',
    body:
      locale === 'en'
        ? settings?.bodyEn?.trim() ||
          settings?.body?.trim() ||
          'We use optional analytics cookies only after your consent. Essential cookies remain active for language and core site functions.'
        : settings?.body?.trim() ||
          'Wir verwenden optionale Analyse-Cookies nur nach Ihrer Einwilligung. Notwendige Cookies bleiben für Sprache und Grundfunktionen aktiv.',
    acceptLabel:
      locale === 'en'
        ? settings?.acceptLabelEn?.trim() || settings?.acceptLabel?.trim() || 'Accept analytics'
        : settings?.acceptLabel?.trim() || 'Analyse erlauben',
    rejectLabel:
      locale === 'en'
        ? settings?.rejectLabelEn?.trim() || settings?.rejectLabel?.trim() || 'Only essential cookies'
        : settings?.rejectLabel?.trim() || 'Nur notwendige Cookies',
    policyHref: settings?.policyHref?.trim() || '/legal',
    policyLabel:
      locale === 'en'
        ? settings?.policyLabelEn?.trim() || settings?.policyLabel?.trim() || 'Privacy policy'
        : settings?.policyLabel?.trim() || 'Datenschutz',
  }
}
