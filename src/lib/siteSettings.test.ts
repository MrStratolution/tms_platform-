import { describe, expect, it } from 'vitest'

import { mergeSiteSettingsDocumentPatch, parseSiteSettingsDocument } from '@/lib/siteSettings'

describe('mergeSiteSettingsDocumentPatch', () => {
  it('merges partial patch without wiping other keys', () => {
    const prev = parseSiteSettingsDocument({
      defaultTitle: 'Site',
      defaultDescription: 'Hello',
      gtmContainerId: 'GTM-AAAAAAA',
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, { defaultTitle: 'New title' })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.defaultTitle).toBe('New title')
      expect(merged.document.defaultDescription).toBe('Hello')
      expect(merged.document.gtmContainerId).toBe('GTM-AAAAAAA')
    }
  })

  it('clears a field when patch sends empty string', () => {
    const prev = parseSiteSettingsDocument({
      defaultTitle: 'X',
      gtmContainerId: 'GTM-BBBBBBB',
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, { gtmContainerId: '' })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.defaultTitle).toBe('X')
      expect(merged.document.gtmContainerId).toBeUndefined()
    }
  })

  it('rejects invalid GTM after merge', () => {
    const prev = parseSiteSettingsDocument({})
    const merged = mergeSiteSettingsDocumentPatch(prev, { gtmContainerId: 'not-gtm' })
    expect(merged.ok).toBe(false)
  })

  it('merges nested branding without wiping unrelated keys', () => {
    const prev = parseSiteSettingsDocument({
      defaultTitle: 'TMA',
      branding: { siteName: 'Old', logoLightUrl: '/a.png' },
      layout: { maxContentWidth: '72rem' },
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, {
      branding: { siteName: 'New', faviconUrl: '/f.ico' },
    })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.branding?.siteName).toBe('New')
      expect(merged.document.branding?.logoLightUrl).toBe('/a.png')
      expect(merged.document.branding?.faviconUrl).toBe('/f.ico')
      expect(merged.document.layout?.maxContentWidth).toBe('72rem')
    }
  })

  it('clears customCss when patch sends empty string', () => {
    const prev = parseSiteSettingsDocument({ customCss: 'body {}' })
    const merged = mergeSiteSettingsDocumentPatch(prev, { customCss: '' })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.customCss).toBeUndefined()
    }
  })

  it('merges color tokens', () => {
    const prev = parseSiteSettingsDocument({
      colors: { primary: '#000' },
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, {
      colors: { accent: '#f00' },
    })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.colors?.primary).toBe('#000')
      expect(merged.document.colors?.accent).toBe('#f00')
    }
  })

  it('merges contact info', () => {
    const prev = parseSiteSettingsDocument({
      contactInfo: { email: 'old@test.com' },
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, {
      contactInfo: { phone: '+1234' },
    })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.contactInfo?.email).toBe('old@test.com')
      expect(merged.document.contactInfo?.phone).toBe('+1234')
    }
  })

  it('replaces social links array', () => {
    const prev = parseSiteSettingsDocument({
      socialLinks: [{ platform: 'twitter', url: 'https://x.com/old' }],
    })
    const merged = mergeSiteSettingsDocumentPatch(prev, {
      socialLinks: [{ platform: 'linkedin', url: 'https://linkedin.com/in/new' }],
    })
    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.socialLinks).toHaveLength(1)
      expect(merged.document.socialLinks?.[0]?.platform).toBe('linkedin')
    }
  })

  it('merges structured header and footer settings without wiping existing chrome fields', () => {
    const prev = parseSiteSettingsDocument({
      header: {
        navCtaLabel: 'Book',
        logoLightUrl: 'uploads/cms/logo-light.png',
        navigationItems: [
          {
            id: 'nav-1',
            type: 'page',
            href: '/services',
            label: 'Services',
          },
        ],
      },
      footer: {
        straplineOverride: 'Old strapline',
        legalLinks: [{ label: 'Privacy', href: '/privacy' }],
      },
    })

    const merged = mergeSiteSettingsDocumentPatch(prev, {
      header: {
        announcement: { enabled: true, text: 'Jetzt live' },
        navigationItems: [
          {
            id: 'nav-2',
            type: 'external',
            href: 'https://example.com',
            label: 'External',
            newTab: true,
          },
        ],
      },
      footer: {
        ctaLabel: 'Book a call',
        showSocialLinks: false,
      },
    })

    expect(merged.ok).toBe(true)
    if (merged.ok) {
      expect(merged.document.header?.logoLightUrl).toBe('uploads/cms/logo-light.png')
      expect(merged.document.header?.announcement?.text).toBe('Jetzt live')
      expect(merged.document.header?.navigationItems?.[0]?.label).toBe('External')
      expect(merged.document.footer?.straplineOverride).toBe('Old strapline')
      expect(merged.document.footer?.ctaLabel).toBe('Book a call')
      expect(merged.document.footer?.legalLinks?.[0]?.label).toBe('Privacy')
      expect(merged.document.footer?.showSocialLinks).toBe(false)
    }
  })
})
