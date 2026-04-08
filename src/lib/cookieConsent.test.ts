import { describe, expect, it } from 'vitest'

import {
  isAnalyticsAllowed,
  localizedCookieConsentCopy,
  normalizeCookieConsentValue,
  shouldShowCookieBanner,
} from '@/lib/cookieConsent'

describe('cookieConsent', () => {
  it('normalizes accepted and rejected states only', () => {
    expect(normalizeCookieConsentValue('accepted')).toBe('accepted')
    expect(normalizeCookieConsentValue('rejected')).toBe('rejected')
    expect(normalizeCookieConsentValue('other')).toBeNull()
  })

  it('allows analytics when consent banner is disabled', () => {
    expect(isAnalyticsAllowed(null, {})).toBe(true)
  })

  it('requires accepted consent when cookie banner is enabled', () => {
    const site = { cookieConsent: { enabled: true } }
    expect(isAnalyticsAllowed(null, site)).toBe(false)
    expect(isAnalyticsAllowed('rejected', site)).toBe(false)
    expect(isAnalyticsAllowed('accepted', site)).toBe(true)
  })

  it('shows the banner only when enabled and undecided', () => {
    const site = { cookieConsent: { enabled: true } }
    expect(shouldShowCookieBanner(null, site)).toBe(true)
    expect(shouldShowCookieBanner('accepted', site)).toBe(false)
    expect(shouldShowCookieBanner('rejected', site)).toBe(false)
  })

  it('localizes banner copy with defaults', () => {
    expect(localizedCookieConsentCopy({}, 'de').title).toBe('Cookies und Datenschutz')
    expect(localizedCookieConsentCopy({}, 'en').title).toBe('Cookies and privacy')
  })
})
