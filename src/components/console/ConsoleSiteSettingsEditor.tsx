'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { ConsoleInlineMediaField } from '@/components/console/ConsoleInlineMediaField'
import { readResponseJson } from '@/lib/safeJson'
import type { SiteSettingsDocument, SiteSettingsPatchDocument } from '@/lib/siteSettings'

type HeaderNavItem = NonNullable<NonNullable<SiteSettingsDocument['header']>['navigationItems']>[number]
type SocialLink = NonNullable<SiteSettingsDocument['socialLinks']>[number]
type HeaderLinkType = HeaderNavItem['type']

type TargetOption = { id: number; label: string; href: string }

type LinkOptionsState = {
  pages: TargetOption[]
  products: TargetOption[]
  services: TargetOption[]
  industries: TargetOption[]
  bookings: TargetOption[]
}

function newNavItem(): HeaderNavItem {
  return {
    id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'page',
    href: '/',
    label: '',
    labelEn: '',
    newTab: false,
    showOnDesktop: true,
    showOnMobile: true,
  }
}

function newNavItemForType(type: HeaderLinkType): HeaderNavItem {
  const base = newNavItem()
  return {
    ...base,
    type,
    href: type === 'external' ? 'https://' : type === 'booking' ? '/book/' : '/',
  }
}

function navTypeLabel(type: HeaderLinkType): string {
  switch (type) {
    case 'page':
      return 'Page'
    case 'product':
      return 'Product'
    case 'service':
      return 'Service'
    case 'industry':
      return 'Industry'
    case 'booking':
      return 'Booking'
    case 'external':
      return 'External'
  }
}

type Props = {
  initialDocument: SiteSettingsDocument
  canEdit: boolean
  /** Site-wide custom CSS (ops/admin only; stripped server-side for other roles). */
  canEditCustomCss?: boolean
}

type FormState = {
  defaultTitle: string
  defaultDescription: string
  titleTemplate: string
  twitterSite: string
  ogImageUrl: string
  googleSiteVerification: string
  gtmContainerId: string
  brandSiteName: string
  brandLogoLight: string
  brandLogoDark: string
  brandFavicon: string
  typoHeading: string
  typoBody: string
  layoutMax: string
  layoutSectionY: string
  layoutGutter: string
  layoutRadius: string
  headerNavUtilityLabel: string
  headerNavUtilityLabelEn: string
  headerNavUtilityHref: string
  headerNavUtilityStyle: 'primary' | 'secondary' | 'ghost'
  headerNavCtaLabel: string
  headerNavCtaLabelEn: string
  headerNavCtaHref: string
  headerNavCtaStyle: 'primary' | 'secondary' | 'ghost'
  headerLogoLight: string
  headerLogoDark: string
  headerLogoAlt: string
  headerLogoWidthDesktop: number
  headerLogoWidthMobile: number
  headerSticky: boolean
  headerTransparentOnHero: boolean
  headerLayout: 'split' | 'centered'
  headerMobileBehavior: 'drawer' | 'sheet'
  headerAnnouncementEnabled: boolean
  headerAnnouncementText: string
  headerAnnouncementTextEn: string
  headerAnnouncementHref: string
  headerAnnouncementStyle: 'subtle' | 'highlight' | 'outline'
  headerAnnouncementMode: 'static' | 'running'
  headerAnnouncementSpeed: 'slow' | 'normal' | 'fast'
  headerAnnouncementPauseOnHover: boolean
  headerNavItems: HeaderNavItem[]
  footerStrap: string
  footerStrapEn: string
  footerLogo: string
  footerLogoAlt: string
  footerLogoWidth: number
  footerLayout: 'stacked' | 'columns' | 'compact'
  footerCtaLabel: string
  footerCtaLabelEn: string
  footerCtaHref: string
  footerCtaStyle: 'primary' | 'secondary' | 'ghost'
  footerMetaLine: string
  footerMetaLineEn: string
  footerShowContact: boolean
  footerShowSocialLinks: boolean
  footerContactEmail: string
  footerContactPhone: string
  footerContactAddress: string
  footerContactCompany: string
  footerSocialLinks: SocialLink[]
  footerLegal1Label: string
  footerLegal1Href: string
  footerLegal2Label: string
  footerLegal2Href: string
  cookieConsentEnabled: boolean
  cookieConsentTitle: string
  cookieConsentTitleEn: string
  cookieConsentBody: string
  cookieConsentBodyEn: string
  cookieConsentAcceptLabel: string
  cookieConsentAcceptLabelEn: string
  cookieConsentRejectLabel: string
  cookieConsentRejectLabelEn: string
  cookieConsentPolicyHref: string
  cookieConsentPolicyLabel: string
  cookieConsentPolicyLabelEn: string
  motionTransitions: string
  colorPrimary: string
  colorSecondary: string
  colorAccent: string
  colorSurface: string
  colorText: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  contactCompany: string
  socialLinksJson: string
  customCss: string
}

function docToForm(d: SiteSettingsDocument): FormState {
  const b = d.branding ?? {}
  const t = d.typography ?? {}
  const l = d.layout ?? {}
  const h = d.header ?? {}
  const cc = d.cookieConsent ?? {}
  const f = d.footer ?? {}
  const links = f.legalLinks ?? []
  const footerContact = f.contact ?? d.contactInfo ?? {}
  const footerSocialLinks = f.socialLinks ?? d.socialLinks ?? []
  return {
    defaultTitle: d.defaultTitle ?? '',
    defaultDescription: d.defaultDescription ?? '',
    titleTemplate: d.titleTemplate ?? '',
    twitterSite: d.twitterSite ?? '',
    ogImageUrl: d.ogImageUrl ?? '',
    googleSiteVerification: d.googleSiteVerification ?? '',
    gtmContainerId: d.gtmContainerId ?? '',
    brandSiteName: b.siteName ?? '',
    brandLogoLight: b.logoLightUrl ?? '',
    brandLogoDark: b.logoDarkUrl ?? '',
    brandFavicon: b.faviconUrl ?? '',
    typoHeading: t.headingFontStack ?? '',
    typoBody: t.bodyFontStack ?? '',
    layoutMax: l.maxContentWidth ?? '',
    layoutSectionY: l.sectionPaddingY ?? '',
    layoutGutter: l.containerPaddingX ?? '',
    layoutRadius: l.borderRadiusScale ?? '',
    headerNavUtilityLabel: h.navUtilityLabel ?? '',
    headerNavUtilityLabelEn: h.navUtilityLabelEn ?? '',
    headerNavUtilityHref: h.navUtilityHref ?? '',
    headerNavUtilityStyle: h.navUtilityStyle ?? 'ghost',
    headerNavCtaLabel: h.navCtaLabel ?? '',
    headerNavCtaLabelEn: h.navCtaLabelEn ?? '',
    headerNavCtaHref: h.navCtaHref ?? '',
    headerNavCtaStyle: h.navCtaStyle ?? 'primary',
    headerLogoLight: h.logoLightUrl ?? '',
    headerLogoDark: h.logoDarkUrl ?? '',
    headerLogoAlt: h.logoAlt ?? '',
    headerLogoWidthDesktop: h.logoWidthDesktop ?? 220,
    headerLogoWidthMobile: h.logoWidthMobile ?? 132,
    headerSticky: h.sticky !== false,
    headerTransparentOnHero: h.transparentOnHero === true,
    headerLayout: h.layout ?? 'split',
    headerMobileBehavior: h.mobileBehavior ?? 'drawer',
    headerAnnouncementEnabled: h.announcement?.enabled === true,
    headerAnnouncementText: h.announcement?.text ?? '',
    headerAnnouncementTextEn: h.announcement?.textEn ?? '',
    headerAnnouncementHref: h.announcement?.href ?? '',
    headerAnnouncementStyle: h.announcement?.style ?? 'subtle',
    headerAnnouncementMode: h.announcement?.mode ?? 'static',
    headerAnnouncementSpeed: h.announcement?.speed ?? 'normal',
    headerAnnouncementPauseOnHover: h.announcement?.pauseOnHover !== false,
    headerNavItems: h.navigationItems ?? [],
    footerStrap: f.straplineOverride ?? '',
    footerStrapEn: f.straplineOverrideEn ?? '',
    footerLogo: f.logoUrl ?? '',
    footerLogoAlt: f.logoAlt ?? '',
    footerLogoWidth: f.logoWidth ?? 184,
    footerLayout: f.layout ?? 'columns',
    footerCtaLabel: f.ctaLabel ?? '',
    footerCtaLabelEn: f.ctaLabelEn ?? '',
    footerCtaHref: f.ctaHref ?? '',
    footerCtaStyle: f.ctaStyle ?? 'primary',
    footerMetaLine: f.metaLine ?? '',
    footerMetaLineEn: f.metaLineEn ?? '',
    footerShowContact: f.showContact !== false,
    footerShowSocialLinks: f.showSocialLinks !== false,
    footerContactEmail: footerContact.email ?? '',
    footerContactPhone: footerContact.phone ?? '',
    footerContactAddress: footerContact.address ?? '',
    footerContactCompany: footerContact.companyName ?? '',
    footerSocialLinks,
    footerLegal1Label: links[0]?.label ?? '',
    footerLegal1Href: links[0]?.href ?? '',
    footerLegal2Label: links[1]?.label ?? '',
    footerLegal2Href: links[1]?.href ?? '',
    cookieConsentEnabled: cc.enabled === true,
    cookieConsentTitle: cc.title ?? '',
    cookieConsentTitleEn: cc.titleEn ?? '',
    cookieConsentBody: cc.body ?? '',
    cookieConsentBodyEn: cc.bodyEn ?? '',
    cookieConsentAcceptLabel: cc.acceptLabel ?? '',
    cookieConsentAcceptLabelEn: cc.acceptLabelEn ?? '',
    cookieConsentRejectLabel: cc.rejectLabel ?? '',
    cookieConsentRejectLabelEn: cc.rejectLabelEn ?? '',
    cookieConsentPolicyHref: cc.policyHref ?? '',
    cookieConsentPolicyLabel: cc.policyLabel ?? '',
    cookieConsentPolicyLabelEn: cc.policyLabelEn ?? '',
    motionTransitions:
      d.motion?.transitionsEnabled === false
        ? 'off'
        : d.motion?.transitionsEnabled === true
          ? 'on'
          : '',
    colorPrimary: d.colors?.primary ?? '',
    colorSecondary: d.colors?.secondary ?? '',
    colorAccent: d.colors?.accent ?? '',
    colorSurface: d.colors?.surfaceBg ?? '',
    colorText: d.colors?.textDefault ?? '',
    contactEmail: d.contactInfo?.email ?? '',
    contactPhone: d.contactInfo?.phone ?? '',
    contactAddress: d.contactInfo?.address ?? '',
    contactCompany: d.contactInfo?.companyName ?? '',
    socialLinksJson: d.socialLinks?.length ? JSON.stringify(d.socialLinks, null, 2) : '',
    customCss: d.customCss ?? '',
  }
}

function formToPatch(f: FormState): SiteSettingsPatchDocument {
  const legal: { label: string; href: string }[] = []
  if (f.footerLegal1Label.trim() && f.footerLegal1Href.trim()) {
    legal.push({ label: f.footerLegal1Label.trim(), href: f.footerLegal1Href.trim() })
  }
  if (f.footerLegal2Label.trim() && f.footerLegal2Href.trim()) {
    legal.push({ label: f.footerLegal2Label.trim(), href: f.footerLegal2Href.trim() })
  }

  const patch: SiteSettingsPatchDocument = {
    defaultTitle: f.defaultTitle,
    defaultDescription: f.defaultDescription,
    titleTemplate: f.titleTemplate,
    twitterSite: f.twitterSite,
    ogImageUrl: f.ogImageUrl,
    googleSiteVerification: f.googleSiteVerification,
    gtmContainerId: f.gtmContainerId,
    branding: {
      siteName: f.brandSiteName,
      logoLightUrl: f.brandLogoLight,
      logoDarkUrl: f.brandLogoDark,
      faviconUrl: f.brandFavicon,
    },
    typography: {
      headingFontStack: f.typoHeading,
      bodyFontStack: f.typoBody,
    },
    layout: {
      maxContentWidth: f.layoutMax,
      sectionPaddingY: f.layoutSectionY,
      containerPaddingX: f.layoutGutter,
      borderRadiusScale: f.layoutRadius,
    },
    header: {
      navUtilityLabel: f.headerNavUtilityLabel,
      navUtilityLabelEn: f.headerNavUtilityLabelEn,
      navUtilityHref: f.headerNavUtilityHref,
      navUtilityStyle: f.headerNavUtilityStyle,
      navCtaLabel: f.headerNavCtaLabel,
      navCtaLabelEn: f.headerNavCtaLabelEn,
      navCtaHref: f.headerNavCtaHref,
      navCtaStyle: f.headerNavCtaStyle,
      logoLightUrl: f.headerLogoLight,
      logoDarkUrl: f.headerLogoDark,
      logoAlt: f.headerLogoAlt,
      logoWidthDesktop: f.headerLogoWidthDesktop,
      logoWidthMobile: f.headerLogoWidthMobile,
      sticky: f.headerSticky,
      transparentOnHero: f.headerTransparentOnHero,
      layout: f.headerLayout,
      mobileBehavior: f.headerMobileBehavior,
      announcement: {
        enabled: f.headerAnnouncementEnabled,
        text: f.headerAnnouncementText,
        textEn: f.headerAnnouncementTextEn,
        href: f.headerAnnouncementHref,
        style: f.headerAnnouncementStyle,
        mode: f.headerAnnouncementMode,
        speed: f.headerAnnouncementSpeed,
        pauseOnHover: f.headerAnnouncementPauseOnHover,
      },
      navigationItems: f.headerNavItems,
    },
    cookieConsent: {
      enabled: f.cookieConsentEnabled,
      title: f.cookieConsentTitle,
      titleEn: f.cookieConsentTitleEn,
      body: f.cookieConsentBody,
      bodyEn: f.cookieConsentBodyEn,
      acceptLabel: f.cookieConsentAcceptLabel,
      acceptLabelEn: f.cookieConsentAcceptLabelEn,
      rejectLabel: f.cookieConsentRejectLabel,
      rejectLabelEn: f.cookieConsentRejectLabelEn,
      policyHref: f.cookieConsentPolicyHref,
      policyLabel: f.cookieConsentPolicyLabel,
      policyLabelEn: f.cookieConsentPolicyLabelEn,
    },
    footer: {
      straplineOverride: f.footerStrap,
      straplineOverrideEn: f.footerStrapEn,
      logoUrl: f.footerLogo,
      logoAlt: f.footerLogoAlt,
      logoWidth: f.footerLogoWidth,
      layout: f.footerLayout,
      ctaLabel: f.footerCtaLabel,
      ctaLabelEn: f.footerCtaLabelEn,
      ctaHref: f.footerCtaHref,
      ctaStyle: f.footerCtaStyle,
      metaLine: f.footerMetaLine,
      metaLineEn: f.footerMetaLineEn,
      showContact: f.footerShowContact,
      showSocialLinks: f.footerShowSocialLinks,
      contact: {
        email: f.footerContactEmail,
        phone: f.footerContactPhone,
        address: f.footerContactAddress,
        companyName: f.footerContactCompany,
      },
      socialLinks: f.footerSocialLinks,
      legalLinks: legal.length > 0 ? legal : [],
    },
  }

  if (f.motionTransitions === 'on') {
    patch.motion = { transitionsEnabled: true }
  } else if (f.motionTransitions === 'off') {
    patch.motion = { transitionsEnabled: false }
  }

  patch.colors = {
    primary: f.colorPrimary,
    secondary: f.colorSecondary,
    accent: f.colorAccent,
    surfaceBg: f.colorSurface,
    textDefault: f.colorText,
  }

  patch.contactInfo = {
    email: f.contactEmail,
    phone: f.contactPhone,
    address: f.contactAddress,
    companyName: f.contactCompany,
  }

  if (f.socialLinksJson.trim()) {
    try {
      const parsed = JSON.parse(f.socialLinksJson)
      if (Array.isArray(parsed)) {
        patch.socialLinks = parsed
      }
    } catch {
      /* invalid JSON — skip; server will reject if schema fails */
    }
  } else {
    patch.socialLinks = []
  }

  if (f.customCss.trim()) {
    patch.customCss = f.customCss
  } else {
    patch.customCss = ''
  }

  return patch
}

export function ConsoleSiteSettingsEditor({
  initialDocument,
  canEdit,
  canEditCustomCss = false,
}: Props) {
  const [form, setForm] = useState(() => docToForm(initialDocument))
  const [linkOptions, setLinkOptions] = useState<LinkOptionsState>({
    pages: [],
    products: [],
    services: [],
    industries: [],
    bookings: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAddedNavItemId, setLastAddedNavItemId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/site-settings', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          error?: string
          siteSettings?: { document: SiteSettingsDocument; updatedAt: string }
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setLoadError(typeof data?.error === 'string' ? data.error : 'Could not load settings')
          return
        }
        if (data?.siteSettings?.document) {
          setForm(docToForm(data.siteSettings.document))
        }
        setLoadError(null)
      } catch {
        if (!cancelled) setLoadError('Network error while loading settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!lastAddedNavItemId) return
    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById(`header-nav-item-${lastAddedNavItemId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      setLastAddedNavItemId(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [lastAddedNavItemId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [pagesRes, productsRes, servicesRes, industriesRes, bookingsRes] =
          await Promise.all([
            fetch('/api/console/pages', { credentials: 'same-origin' }),
            fetch('/api/console/products', { credentials: 'same-origin' }),
            fetch('/api/console/services', { credentials: 'same-origin' }),
            fetch('/api/console/industries', { credentials: 'same-origin' }),
            fetch('/api/console/booking-profiles', { credentials: 'same-origin' }),
          ])

        const [pagesData, productsData, servicesData, industriesData, bookingsData] =
          await Promise.all([
            readResponseJson<{ pages?: { id: number; title: string; slug: string }[] }>(pagesRes),
            readResponseJson<{ products?: { id: number; name: string; slug: string }[] }>(productsRes),
            readResponseJson<{ services?: { id: number; name: string; slug: string }[] }>(servicesRes),
            readResponseJson<{ industries?: { id: number; name: string; slug: string }[] }>(industriesRes),
            readResponseJson<{ bookingProfiles?: { id: number; internalSlug: string | null }[] }>(bookingsRes),
          ])

        if (cancelled) return
        setLinkOptions({
          pages: (pagesData?.pages ?? []).map((row) => ({
            id: row.id,
            label: row.title,
            href: row.slug === 'home' ? '/' : `/${row.slug}`,
          })),
          products: (productsData?.products ?? []).map((row) => ({
            id: row.id,
            label: row.name,
            href: `/products/${row.slug}`,
          })),
          services: (servicesData?.services ?? []).map((row) => ({
            id: row.id,
            label: row.name,
            href: `/services#${row.slug}`,
          })),
          industries: (industriesData?.industries ?? []).map((row) => ({
            id: row.id,
            label: row.name,
            href: `/industries#${row.slug}`,
          })),
          bookings: (bookingsData?.bookingProfiles ?? []).map((row) => ({
            id: row.id,
            label: row.internalSlug?.trim() || `Booking ${row.id}`,
            href: `/book/${row.internalSlug?.trim() || row.id}`,
          })),
        })
      } catch {
        if (!cancelled) {
          setLinkOptions({
            pages: [],
            products: [],
            services: [],
            industries: [],
            bookings: [],
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function optionsForType(type: HeaderLinkType): TargetOption[] {
    switch (type) {
      case 'page':
        return linkOptions.pages
      case 'product':
        return linkOptions.products
      case 'service':
        return linkOptions.services
      case 'industry':
        return linkOptions.industries
      case 'booking':
        return linkOptions.bookings
      case 'external':
      default:
        return []
    }
  }

  function updateNavItem(index: number, patch: Partial<HeaderNavItem>) {
    setForm((current) => ({
      ...current,
      headerNavItems: current.headerNavItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function moveNavItem(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction
      if (target < 0 || target >= current.headerNavItems.length) return current
      const next = [...current.headerNavItems]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...current, headerNavItems: next }
    })
  }

  function addNavItem(type: HeaderLinkType) {
    const item = newNavItemForType(type)
    setForm((current) => ({
      ...current,
      headerNavItems: [item, ...current.headerNavItems],
    }))
    setLastAddedNavItemId(item.id)
  }

  function updateFooterSocial(index: number, patch: Partial<SocialLink>) {
    setForm((current) => ({
      ...current,
      footerSocialLinks: current.footerSocialLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let document = formToPatch(form)
    if (!canEditCustomCss) {
      const { customCss: _omit, ...rest } = document
      void _omit
      document = rest
    }

    setSaving(true)
    try {
      const res = await fetch('/api/console/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        details?: unknown
        siteSettings?: { document: SiteSettingsDocument; updatedAt: string }
      }>(res)
      if (!res.ok) {
        const msg =
          typeof data?.error === 'string'
            ? data.error
            : 'Save failed — check GTM format (GTM-XXXXXXX) or field limits.'
        setError(msg)
        return
      }
      if (data?.siteSettings?.document) {
        setForm(docToForm(data.siteSettings.document))
      }
      setSuccess(
        `Saved at ${new Date(data?.siteSettings?.updatedAt ?? Date.now()).toLocaleString()}`,
      )
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit
  const descLen = form.defaultDescription.length
  const descMax = 500

  if (loading) {
    return (
      <p className="tma-console-note" role="status">
        Loading site settings…
      </p>
    )
  }

  if (loadError) {
    return (
      <p className="tma-console-error" role="alert">
        {loadError}
      </p>
    )
  }

  return (
    <form className="tma-console-form tma-console-settings-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}

      {canEdit ? (
        <div className="tma-console-actions tma-console-actions--settings-top">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      ) : null}

      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Header</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Global site header: announcement bar, logo, CTA, manual navigation, and responsive behavior.
        </p>
        <ConsoleInlineMediaField
          label="Header logo (default)"
          value={form.headerLogoLight}
          onChange={(next) => setForm((f) => ({ ...f, headerLogoLight: next ?? '' }))}
          disabled={saving || readOnly}
          folderSuggestion="brand"
        />
        <ConsoleInlineMediaField
          label="Header logo (alternate)"
          value={form.headerLogoDark}
          onChange={(next) => setForm((f) => ({ ...f, headerLogoDark: next ?? '' }))}
          disabled={saving || readOnly}
          folderSuggestion="brand"
        />
        <label className="tma-console-label">
          Logo alt text
          <input
            type="text"
            className="tma-console-input"
            value={form.headerLogoAlt}
            onChange={(e) => setForm((f) => ({ ...f, headerLogoAlt: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Logo width on desktop
            <input
              type="range"
              min={80}
              max={360}
              step={4}
              value={form.headerLogoWidthDesktop}
              onChange={(e) =>
                setForm((f) => ({ ...f, headerLogoWidthDesktop: Number.parseInt(e.target.value, 10) || 220 }))
              }
              disabled={saving || readOnly}
            />
            <span className="tma-console-hint">{form.headerLogoWidthDesktop}px</span>
          </label>
          <label className="tma-console-label">
            Logo width on mobile
            <input
              type="range"
              min={56}
              max={240}
              step={4}
              value={form.headerLogoWidthMobile}
              onChange={(e) =>
                setForm((f) => ({ ...f, headerLogoWidthMobile: Number.parseInt(e.target.value, 10) || 132 }))
              }
              disabled={saving || readOnly}
            />
            <span className="tma-console-hint">{form.headerLogoWidthMobile}px</span>
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Desktop layout
            <select
              className="tma-console-input"
              value={form.headerLayout}
              onChange={(e) =>
                setForm((f) => ({ ...f, headerLayout: e.target.value as FormState['headerLayout'] }))
              }
              disabled={saving || readOnly}
            >
              <option value="split">Split</option>
              <option value="centered">Centered</option>
            </select>
          </label>
          <label className="tma-console-label">
            Mobile menu style
            <select
              className="tma-console-input"
              value={form.headerMobileBehavior}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  headerMobileBehavior: e.target.value as FormState['headerMobileBehavior'],
                }))
              }
              disabled={saving || readOnly}
            >
              <option value="drawer">Side drawer</option>
              <option value="sheet">Top sheet</option>
            </select>
          </label>
        </div>
        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={form.headerSticky}
            onChange={(e) => setForm((f) => ({ ...f, headerSticky: e.target.checked }))}
            disabled={saving || readOnly}
          />{' '}
          Sticky header
        </label>
        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={form.headerTransparentOnHero}
            onChange={(e) => setForm((f) => ({ ...f, headerTransparentOnHero: e.target.checked }))}
            disabled={saving || readOnly}
          />{' '}
          More transparent over hero sections
        </label>
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Announcement bar</legend>
          <label className="tma-console-label tma-console-label--inline">
            <input
              type="checkbox"
              checked={form.headerAnnouncementEnabled}
              onChange={(e) => setForm((f) => ({ ...f, headerAnnouncementEnabled: e.target.checked }))}
              disabled={saving || readOnly}
            />{' '}
            Show announcement bar
          </label>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Text (DE/default)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerAnnouncementText}
                onChange={(e) => setForm((f) => ({ ...f, headerAnnouncementText: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Text (EN)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerAnnouncementTextEn}
                onChange={(e) => setForm((f) => ({ ...f, headerAnnouncementTextEn: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Link URL
              <input
                type="text"
                className="tma-console-input"
                value={form.headerAnnouncementHref}
                onChange={(e) => setForm((f) => ({ ...f, headerAnnouncementHref: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Style
              <select
                className="tma-console-input"
                value={form.headerAnnouncementStyle}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headerAnnouncementStyle: e.target.value as FormState['headerAnnouncementStyle'],
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="subtle">Subtle</option>
                <option value="highlight">Highlight</option>
                <option value="outline">Outline</option>
              </select>
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Behavior
              <select
                className="tma-console-input"
                value={form.headerAnnouncementMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headerAnnouncementMode: e.target.value as FormState['headerAnnouncementMode'],
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="static">Static</option>
                <option value="running">Running marquee</option>
              </select>
            </label>
            <label className="tma-console-label">
              Speed
              <select
                className="tma-console-input"
                value={form.headerAnnouncementSpeed}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headerAnnouncementSpeed: e.target.value as FormState['headerAnnouncementSpeed'],
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
          </div>
          <label className="tma-console-label tma-console-label--inline">
            <input
              type="checkbox"
              checked={form.headerAnnouncementPauseOnHover}
              onChange={(e) =>
                setForm((f) => ({ ...f, headerAnnouncementPauseOnHover: e.target.checked }))
              }
              disabled={saving || readOnly}
            />{' '}
            Pause running announcement on hover
          </label>
        </fieldset>

        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Header utility CTA</legend>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Label (DE/default)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavUtilityLabel}
                onChange={(e) => setForm((f) => ({ ...f, headerNavUtilityLabel: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Label (EN)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavUtilityLabelEn}
                onChange={(e) => setForm((f) => ({ ...f, headerNavUtilityLabelEn: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              CTA URL
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavUtilityHref}
                onChange={(e) => setForm((f) => ({ ...f, headerNavUtilityHref: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              CTA style
              <select
                className="tma-console-input"
                value={form.headerNavUtilityStyle}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headerNavUtilityStyle: e.target.value as FormState['headerNavUtilityStyle'],
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="ghost">Ghost</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Header CTA</legend>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Label (DE/default)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavCtaLabel}
                onChange={(e) => setForm((f) => ({ ...f, headerNavCtaLabel: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Label (EN)
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavCtaLabelEn}
                onChange={(e) => setForm((f) => ({ ...f, headerNavCtaLabelEn: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              CTA URL
              <input
                type="text"
                className="tma-console-input"
                value={form.headerNavCtaHref}
                onChange={(e) => setForm((f) => ({ ...f, headerNavCtaHref: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              CTA style
              <select
                className="tma-console-input"
                value={form.headerNavCtaStyle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headerNavCtaStyle: e.target.value as FormState['headerNavCtaStyle'] }))
                }
                disabled={saving || readOnly}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="ghost">Ghost</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Manual navigation</legend>
          <p className="tma-console-note" style={{ marginTop: 0 }}>
            Add menu items by intent first. Pick the target type, then choose the linked page/product/service or
            paste an external URL. The editor will fill the destination for you.
          </p>
          <div className="tma-console-actions" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="tma-console-submit" onClick={() => addNavItem('page')} disabled={saving || readOnly}>
              Add page link
            </button>
            <button type="button" className="tma-console-btn-secondary" onClick={() => addNavItem('product')} disabled={saving || readOnly}>
              Add product link
            </button>
            <button type="button" className="tma-console-btn-secondary" onClick={() => addNavItem('booking')} disabled={saving || readOnly}>
              Add booking link
            </button>
            <button type="button" className="tma-console-btn-secondary" onClick={() => addNavItem('external')} disabled={saving || readOnly}>
              Add external link
            </button>
          </div>
          {form.headerNavItems.length === 0 ? (
            <p className="tma-console-lead">No navigation items yet. Use the quick add buttons above.</p>
          ) : null}
          {form.headerNavItems.map((item, index) => {
            const options = optionsForType(item.type)
            const summaryLabel =
              item.label.trim() ||
              item.labelEn?.trim() ||
              options.find((option) => option.id === item.refId)?.label ||
              item.href ||
              `${navTypeLabel(item.type)} link`
            return (
              <div
                id={`header-nav-item-${item.id}`}
                key={item.id}
                style={{
                  border: '1px solid rgba(231, 248, 200, 0.12)',
                  borderRadius: '14px',
                  padding: '1rem',
                  marginBottom: '0.9rem',
                }}
              >
                <div className="tma-console-actions" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{summaryLabel}</strong>
                    <div className="tma-console-hint">
                      Item {index + 1} · {navTypeLabel(item.type)} · {item.showOnDesktop !== false ? 'desktop' : 'desktop hidden'} · {item.showOnMobile !== false ? 'mobile' : 'mobile hidden'}
                    </div>
                  </div>
                  <div className="tma-console-actions">
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveNavItem(index, -1)} disabled={saving || readOnly || index === 0}>Up</button>
                    <button type="button" className="tma-console-btn-secondary" onClick={() => moveNavItem(index, 1)} disabled={saving || readOnly || index === form.headerNavItems.length - 1}>Down</button>
                    <button
                      type="button"
                      className="tma-console-btn-secondary"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          headerNavItems: [
                            ...f.headerNavItems.slice(0, index + 1),
                            { ...item, id: newNavItem().id },
                            ...f.headerNavItems.slice(index + 1),
                          ],
                        }))
                      }
                      disabled={saving || readOnly}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="tma-console-btn-danger tma-console-btn-danger--small"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          headerNavItems: f.headerNavItems.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      disabled={saving || readOnly}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Link type
                    <select
                      className="tma-console-input"
                      value={item.type}
                      onChange={(e) =>
                        updateNavItem(index, {
                          type: e.target.value as HeaderLinkType,
                          refId: undefined,
                          href:
                            e.target.value === 'external'
                              ? 'https://'
                              : e.target.value === 'booking'
                                ? '/book/'
                                : '/',
                        })
                      }
                      disabled={saving || readOnly}
                    >
                      <option value="page">Page</option>
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="industry">Industry</option>
                      <option value="booking">Booking</option>
                      <option value="external">External</option>
                    </select>
                  </label>
                  {item.type !== 'external' ? (
                    <label className="tma-console-label">
                      Target
                      <select
                        className="tma-console-input"
                        value={item.refId ?? ''}
                        onChange={(e) => {
                          const nextId = Number.parseInt(e.target.value, 10)
                          const match = options.find((option) => option.id === nextId)
                          updateNavItem(index, {
                            refId: Number.isFinite(nextId) ? nextId : undefined,
                            href: match?.href ?? item.href,
                            label: item.label?.trim() ? item.label : match?.label || '',
                            labelEn: item.labelEn?.trim() ? item.labelEn : '',
                          })
                        }}
                        disabled={saving || readOnly || options.length === 0}
                      >
                        <option value="">Select…</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {options.length === 0 ? (
                        <span className="tma-console-hint">
                          No published {item.type === 'booking' ? 'booking profiles' : `${item.type}s`} available yet. You can still type a URL below.
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Menu label
                    <input
                      type="text"
                      className="tma-console-input"
                      value={item.label}
                      onChange={(e) => updateNavItem(index, { label: e.target.value })}
                      disabled={saving || readOnly}
                      placeholder="What visitors should see"
                    />
                  </label>
                  <label className="tma-console-label">
                    English label
                    <input
                      type="text"
                      className="tma-console-input"
                      value={item.labelEn ?? ''}
                      onChange={(e) => updateNavItem(index, { labelEn: e.target.value })}
                      disabled={saving || readOnly}
                      placeholder="Optional English override"
                    />
                  </label>
                </div>
                <label className="tma-console-label">
                  {item.type === 'external' ? 'External URL' : 'Destination URL'}
                  <input
                    type="text"
                    className="tma-console-input"
                    value={item.href}
                    onChange={(e) => updateNavItem(index, { href: e.target.value })}
                    disabled={saving || readOnly}
                    placeholder={item.type === 'external' ? 'https://example.com' : '/contact'}
                  />
                  <span className="tma-console-hint">
                    {item.type === 'external'
                      ? 'Paste the full external link.'
                      : 'Auto-filled from the target. Adjust only if you want a custom destination.'}
                  </span>
                </label>
                <details style={{ marginTop: '0.75rem' }}>
                  <summary className="tma-console-hint" style={{ cursor: 'pointer' }}>
                    Advanced options
                  </summary>
                  <div style={{ marginTop: '0.85rem' }}>
                    <div className="tma-console-field-row">
                      <label className="tma-console-label">
                        Badge (optional)
                        <input
                          type="text"
                          className="tma-console-input"
                          value={item.badge ?? ''}
                          onChange={(e) => updateNavItem(index, { badge: e.target.value })}
                          disabled={saving || readOnly}
                          placeholder="e.g. New"
                        />
                      </label>
                      <label className="tma-console-label">
                        Badge (EN)
                        <input
                          type="text"
                          className="tma-console-input"
                          value={item.badgeEn ?? ''}
                          onChange={(e) => updateNavItem(index, { badgeEn: e.target.value })}
                          disabled={saving || readOnly}
                          placeholder="Optional English badge"
                        />
                      </label>
                    </div>
                    <div className="tma-console-actions">
                      <label className="tma-console-label tma-console-label--inline">
                        <input
                          type="checkbox"
                          checked={item.newTab === true}
                          onChange={(e) => updateNavItem(index, { newTab: e.target.checked })}
                          disabled={saving || readOnly}
                        />{' '}
                        Open in new tab
                      </label>
                      <label className="tma-console-label tma-console-label--inline">
                        <input
                          type="checkbox"
                          checked={item.showOnDesktop !== false}
                          onChange={(e) => updateNavItem(index, { showOnDesktop: e.target.checked })}
                          disabled={saving || readOnly}
                        />{' '}
                        Show on desktop
                      </label>
                      <label className="tma-console-label tma-console-label--inline">
                        <input
                          type="checkbox"
                          checked={item.showOnMobile !== false}
                          onChange={(e) => updateNavItem(index, { showOnMobile: e.target.checked })}
                          disabled={saving || readOnly}
                        />{' '}
                        Show on mobile
                      </label>
                    </div>
                  </div>
                </details>
              </div>
            )
          })}
        </fieldset>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Footer</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Footer-specific content. These fields can override the global contact and social defaults below.
        </p>
        <ConsoleInlineMediaField
          label="Footer logo"
          value={form.footerLogo}
          onChange={(next) => setForm((f) => ({ ...f, footerLogo: next ?? '' }))}
          disabled={saving || readOnly}
          folderSuggestion="brand"
        />
        <label className="tma-console-label">
          Footer logo alt text
          <input
            type="text"
            className="tma-console-input"
            value={form.footerLogoAlt}
            onChange={(e) => setForm((f) => ({ ...f, footerLogoAlt: e.target.value }))}
            disabled={saving || readOnly}
          />
        </label>
        <label className="tma-console-label">
          Footer logo width
          <input
            type="range"
            min={80}
            max={360}
            step={4}
            value={form.footerLogoWidth}
            onChange={(e) =>
              setForm((f) => ({ ...f, footerLogoWidth: Number.parseInt(e.target.value, 10) || 184 }))
            }
            disabled={saving || readOnly}
          />
          <span className="tma-console-hint">{form.footerLogoWidth}px</span>
        </label>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Strapline (DE/default)
            <textarea
              className="tma-console-textarea-prose"
              value={form.footerStrap}
              onChange={(e) => setForm((f) => ({ ...f, footerStrap: e.target.value }))}
              disabled={saving || readOnly}
              rows={2}
            />
          </label>
          <label className="tma-console-label">
            Strapline (EN)
            <textarea
              className="tma-console-textarea-prose"
              value={form.footerStrapEn}
              onChange={(e) => setForm((f) => ({ ...f, footerStrapEn: e.target.value }))}
              disabled={saving || readOnly}
              rows={2}
            />
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Footer layout
            <select
              className="tma-console-input"
              value={form.footerLayout}
              onChange={(e) => setForm((f) => ({ ...f, footerLayout: e.target.value as FormState['footerLayout'] }))}
              disabled={saving || readOnly}
            >
              <option value="columns">Columns</option>
              <option value="stacked">Stacked</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label className="tma-console-label">
            Meta line (DE/default)
            <input
              type="text"
              className="tma-console-input"
              value={form.footerMetaLine}
              onChange={(e) => setForm((f) => ({ ...f, footerMetaLine: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <label className="tma-console-label">
          Meta line (EN)
          <input
            type="text"
            className="tma-console-input"
            value={form.footerMetaLineEn}
            onChange={(e) => setForm((f) => ({ ...f, footerMetaLineEn: e.target.value }))}
            disabled={saving || readOnly}
          />
        </label>
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Footer CTA</legend>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Label (DE/default)
              <input
                type="text"
                className="tma-console-input"
                value={form.footerCtaLabel}
                onChange={(e) => setForm((f) => ({ ...f, footerCtaLabel: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Label (EN)
              <input
                type="text"
                className="tma-console-input"
                value={form.footerCtaLabelEn}
                onChange={(e) => setForm((f) => ({ ...f, footerCtaLabelEn: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              CTA URL
              <input
                type="text"
                className="tma-console-input"
                value={form.footerCtaHref}
                onChange={(e) => setForm((f) => ({ ...f, footerCtaHref: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Style
              <select
                className="tma-console-input"
                value={form.footerCtaStyle}
                onChange={(e) => setForm((f) => ({ ...f, footerCtaStyle: e.target.value as FormState['footerCtaStyle'] }))}
                disabled={saving || readOnly}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="ghost">Ghost</option>
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Footer contact</legend>
          <label className="tma-console-label tma-console-label--inline">
            <input
              type="checkbox"
              checked={form.footerShowContact}
              onChange={(e) => setForm((f) => ({ ...f, footerShowContact: e.target.checked }))}
              disabled={saving || readOnly}
            />{' '}
            Show footer contact block
          </label>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Company
              <input
                type="text"
                className="tma-console-input"
                value={form.footerContactCompany}
                onChange={(e) => setForm((f) => ({ ...f, footerContactCompany: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Email
              <input
                type="email"
                className="tma-console-input"
                value={form.footerContactEmail}
                onChange={(e) => setForm((f) => ({ ...f, footerContactEmail: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Phone
              <input
                type="text"
                className="tma-console-input"
                value={form.footerContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, footerContactPhone: e.target.value }))}
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Address
              <textarea
                className="tma-console-textarea-prose"
                value={form.footerContactAddress}
                onChange={(e) => setForm((f) => ({ ...f, footerContactAddress: e.target.value }))}
                disabled={saving || readOnly}
                rows={2}
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Footer social links</legend>
          <label className="tma-console-label tma-console-label--inline">
            <input
              type="checkbox"
              checked={form.footerShowSocialLinks}
              onChange={(e) => setForm((f) => ({ ...f, footerShowSocialLinks: e.target.checked }))}
              disabled={saving || readOnly}
            />{' '}
            Show footer social links
          </label>
          {form.footerSocialLinks.map((link, index) => (
            <div key={`${link.url}-${index}`} className="tma-console-field-row">
              <label className="tma-console-label">
                Platform
                <input
                  type="text"
                  className="tma-console-input"
                  value={link.platform}
                  onChange={(e) => updateFooterSocial(index, { platform: e.target.value })}
                  disabled={saving || readOnly}
                />
              </label>
              <label className="tma-console-label">
                URL
                <input
                  type="text"
                  className="tma-console-input"
                  value={link.url}
                  onChange={(e) => updateFooterSocial(index, { url: e.target.value })}
                  disabled={saving || readOnly}
                />
              </label>
              <label className="tma-console-label">
                Label (optional)
                <input
                  type="text"
                  className="tma-console-input"
                  value={link.label ?? ''}
                  onChange={(e) => updateFooterSocial(index, { label: e.target.value })}
                  disabled={saving || readOnly}
                />
              </label>
              <div className="tma-console-actions" style={{ alignSelf: 'end' }}>
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      footerSocialLinks: f.footerSocialLinks.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  disabled={saving || readOnly}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="tma-console-actions">
            <button
              type="button"
              className="tma-console-submit"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  footerSocialLinks: [...f.footerSocialLinks, { platform: 'linkedin', url: '', label: '' }],
                }))
              }
              disabled={saving || readOnly}
            >
              Add social link
            </button>
          </div>
        </fieldset>
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1rem' }}>
          <legend className="tma-console-subheading">Footer legal links</legend>
          <p className="tma-console-note" style={{ marginTop: 0 }}>
            Up to two utility links such as privacy policy, imprint, or terms.
          </p>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Link 1 label
              <input
                type="text"
                className="tma-console-input"
                value={form.footerLegal1Label}
                onChange={(e) => setForm((f) => ({ ...f, footerLegal1Label: e.target.value }))}
                disabled={saving || readOnly}
                autoComplete="off"
              />
            </label>
            <label className="tma-console-label">
              Link 1 URL
              <input
                type="text"
                className="tma-console-input"
                value={form.footerLegal1Href}
                onChange={(e) => setForm((f) => ({ ...f, footerLegal1Href: e.target.value }))}
                disabled={saving || readOnly}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Link 2 label
              <input
                type="text"
                className="tma-console-input"
                value={form.footerLegal2Label}
                onChange={(e) => setForm((f) => ({ ...f, footerLegal2Label: e.target.value }))}
                disabled={saving || readOnly}
                autoComplete="off"
              />
            </label>
            <label className="tma-console-label">
              Link 2 URL
              <input
                type="text"
                className="tma-console-input"
                value={form.footerLegal2Href}
                onChange={(e) => setForm((f) => ({ ...f, footerLegal2Href: e.target.value }))}
                disabled={saving || readOnly}
                autoComplete="off"
              />
            </label>
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Branding</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Site name is used for metadata and <code>{'{{site_name}}'}</code> in rich text blocks. Logo URLs
          may be paths (e.g. <code>/brand/…</code>) or https.
        </p>
        <label className="tma-console-label">
          Site display name
          <input
            type="text"
            className="tma-console-input"
            value={form.brandSiteName}
            onChange={(e) => setForm((f) => ({ ...f, brandSiteName: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <ConsoleInlineMediaField
          label="Logo (light header)"
          value={form.brandLogoLight}
          onChange={(next) => setForm((f) => ({ ...f, brandLogoLight: next ?? '' }))}
          disabled={saving || readOnly}
          helpText="Used as the default light logo in metadata and brand surfaces."
          folderSuggestion="brand"
          chooseLabel="Choose logo"
          uploadLabel="Upload logo"
        />
        <ConsoleInlineMediaField
          label="Logo (dark / alt)"
          value={form.brandLogoDark}
          onChange={(next) => setForm((f) => ({ ...f, brandLogoDark: next ?? '' }))}
          disabled={saving || readOnly}
          helpText="Optional alternate logo for dark or inverted brand placements."
          folderSuggestion="brand"
          chooseLabel="Choose alt logo"
          uploadLabel="Upload alt logo"
        />
        <ConsoleInlineMediaField
          label="Favicon"
          value={form.brandFavicon}
          onChange={(next) => setForm((f) => ({ ...f, brandFavicon: next ?? '' }))}
          disabled={saving || readOnly}
          helpText="Used for the browser tab icon and app icon. Square SVG, PNG, or ICO works best."
          folderSuggestion="brand"
          accept="image/*,.svg,.ico"
          chooseLabel="Choose favicon"
          uploadLabel="Upload favicon"
        />
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Typography (CSS variables)</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Optional font stacks for <code>--font-display</code> and <code>--font-body</code>. Example:{' '}
          <code>Inter, system-ui, sans-serif</code>
        </p>
        <label className="tma-console-label">
          Heading / display stack
          <input
            type="text"
            className="tma-console-input"
            value={form.typoHeading}
            onChange={(e) => setForm((f) => ({ ...f, typoHeading: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Body stack
          <input
            type="text"
            className="tma-console-input"
            value={form.typoBody}
            onChange={(e) => setForm((f) => ({ ...f, typoBody: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Layout tokens</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          CSS values only (e.g. <code>80rem</code>, <code>clamp(1rem, 4vw, 2rem)</code>). Leave blank to use
          theme defaults from <code>tma-tokens.css</code>.
        </p>
        <label className="tma-console-label">
          Max content width (<code>--tma-max</code>)
          <input
            type="text"
            className="tma-console-input"
            value={form.layoutMax}
            onChange={(e) => setForm((f) => ({ ...f, layoutMax: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="72rem"
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Section vertical rhythm (<code>--tma-section-y</code>)
          <input
            type="text"
            className="tma-console-input"
            value={form.layoutSectionY}
            onChange={(e) => setForm((f) => ({ ...f, layoutSectionY: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Horizontal gutter (<code>--tma-gutter</code>)
          <input
            type="text"
            className="tma-console-input"
            value={form.layoutGutter}
            onChange={(e) => setForm((f) => ({ ...f, layoutGutter: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Border radius scale (<code>--tma-radius-scale</code>)
          <input
            type="text"
            className="tma-console-input"
            value={form.layoutRadius}
            onChange={(e) => setForm((f) => ({ ...f, layoutRadius: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="optional"
            autoComplete="off"
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Motion defaults</legend>
        <label className="tma-console-label">
          Section transitions
          <select
            className="tma-console-input"
            value={form.motionTransitions}
            onChange={(e) => setForm((f) => ({ ...f, motionTransitions: e.target.value }))}
            disabled={saving || readOnly}
          >
            <option value="">Theme default</option>
            <option value="on">Enabled</option>
            <option value="off">Reduced (prefer less motion)</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Brand colors (CSS variables)</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          CSS color values emitted as <code>--tma-color-*</code> variables. Use any valid CSS color
          (hex, rgb, hsl, oklch). Leave blank for theme defaults.
        </p>
        <label className="tma-console-label">
          Primary
          <input
            type="text"
            className="tma-console-input"
            value={form.colorPrimary}
            onChange={(e) => setForm((f) => ({ ...f, colorPrimary: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="#e7f8c8"
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Secondary
          <input
            type="text"
            className="tma-console-input"
            value={form.colorSecondary}
            onChange={(e) => setForm((f) => ({ ...f, colorSecondary: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Accent
          <input
            type="text"
            className="tma-console-input"
            value={form.colorAccent}
            onChange={(e) => setForm((f) => ({ ...f, colorAccent: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Surface / background
          <input
            type="text"
            className="tma-console-input"
            value={form.colorSurface}
            onChange={(e) => setForm((f) => ({ ...f, colorSurface: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Default text
          <input
            type="text"
            className="tma-console-input"
            value={form.colorText}
            onChange={(e) => setForm((f) => ({ ...f, colorText: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Contact information</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Used by shortcodes <code>{'{{contact_email}}'}</code>, <code>{'{{contact_phone}}'}</code>,{' '}
          <code>{'{{company_name}}'}</code> in rich text blocks, and by footer / structured data.
        </p>
        <label className="tma-console-label">
          Email
          <input
            type="email"
            className="tma-console-input"
            value={form.contactEmail}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="hello@example.com"
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Phone
          <input
            type="tel"
            className="tma-console-input"
            value={form.contactPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Company / legal name
          <input
            type="text"
            className="tma-console-input"
            value={form.contactCompany}
            onChange={(e) => setForm((f) => ({ ...f, contactCompany: e.target.value }))}
            disabled={saving || readOnly}
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label">
          Address
          <textarea
            className="tma-console-textarea-prose"
            value={form.contactAddress}
            onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))}
            disabled={saving || readOnly}
            rows={2}
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Social links</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          JSON array of objects: <code>[{'{ "platform": "linkedin", "url": "https://…" }'}]</code>.
          Platforms: linkedin, twitter, instagram, facebook, youtube, github, tiktok.
        </p>
        <label className="tma-console-label">
          Social links JSON
          <textarea
            className="tma-console-textarea-json"
            value={form.socialLinksJson}
            onChange={(e) => setForm((f) => ({ ...f, socialLinksJson: e.target.value }))}
            disabled={saving || readOnly}
            rows={5}
            spellCheck={false}
            placeholder={'[\n  { "platform": "linkedin", "url": "https://linkedin.com/company/…" }\n]'}
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">SEO defaults</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Used when a page or product leaves title, description, or OG image empty. The public site
          root layout uses these as the baseline; page-level SEO overrides when set.
        </p>

        <label className="tma-console-label">
          Default site title
          <input
            type="text"
            className="tma-console-input"
            value={form.defaultTitle}
            onChange={(e) => setForm((f) => ({ ...f, defaultTitle: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="The Modesty Argument"
            autoComplete="off"
          />
        </label>

        <label className="tma-console-label">
          Title template
          <input
            type="text"
            className="tma-console-input"
            value={form.titleTemplate}
            onChange={(e) => setForm((f) => ({ ...f, titleTemplate: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="%s — TMA"
            autoComplete="off"
          />
        </label>

        <label className="tma-console-label">
          Default meta description
          <textarea
            className="tma-console-textarea-prose"
            value={form.defaultDescription}
            onChange={(e) => setForm((f) => ({ ...f, defaultDescription: e.target.value }))}
            disabled={saving || readOnly}
            rows={4}
            maxLength={descMax}
            aria-describedby="tma-site-desc-count"
          />
          <span id="tma-site-desc-count" className="tma-console-hint">
            {descLen} / {descMax} characters
          </span>
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Social &amp; verification</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Default Open Graph image and Twitter card hints when a page does not set its own.
        </p>

        <label className="tma-console-label">
          Default OG image URL
          <input
            type="text"
            className="tma-console-input"
            value={form.ogImageUrl}
            onChange={(e) => setForm((f) => ({ ...f, ogImageUrl: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="https://… or /uploads/cms/…"
            autoComplete="off"
          />
        </label>

        <label className="tma-console-label">
          Twitter / X site handle
          <input
            type="text"
            className="tma-console-input"
            value={form.twitterSite}
            onChange={(e) => setForm((f) => ({ ...f, twitterSite: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="@yourbrand"
            autoComplete="off"
          />
        </label>

        <label className="tma-console-label">
          Google Search Console verification (meta content value)
          <input
            type="text"
            className="tma-console-input"
            value={form.googleSiteVerification}
            onChange={(e) => setForm((f) => ({ ...f, googleSiteVerification: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="Paste the content= value from Google’s meta tag"
            autoComplete="off"
          />
        </label>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Tracking</legend>
        <label className="tma-console-label">
          Google Tag Manager container ID
          <input
            type="text"
            className="tma-console-input"
            value={form.gtmContainerId}
            onChange={(e) => setForm((f) => ({ ...f, gtmContainerId: e.target.value }))}
            disabled={saving || readOnly}
            placeholder="GTM-XXXXXXX"
            autoComplete="off"
          />
        </label>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          Injected on the public site only. Leave empty to disable GTM. First-party events still use{' '}
          <code>POST /api/tracking/event</code>.
        </p>
      </fieldset>

      <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
        <legend className="tma-console-subheading">Cookie consent</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          When enabled, analytics scripts only load after the visitor accepts cookies. German remains
          the default copy with English fallback.
        </p>
        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={form.cookieConsentEnabled}
            onChange={(e) => setForm((f) => ({ ...f, cookieConsentEnabled: e.target.checked }))}
            disabled={saving || readOnly}
          />{' '}
          Show cookie banner and gate analytics
        </label>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Title (DE/default)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentTitle}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentTitle: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
          <label className="tma-console-label">
            Title (EN)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentTitleEn: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Body (DE/default)
            <textarea
              className="tma-console-textarea-prose"
              rows={3}
              value={form.cookieConsentBody}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentBody: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
          <label className="tma-console-label">
            Body (EN)
            <textarea
              className="tma-console-textarea-prose"
              rows={3}
              value={form.cookieConsentBodyEn}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentBodyEn: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Accept label (DE/default)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentAcceptLabel}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentAcceptLabel: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
          <label className="tma-console-label">
            Accept label (EN)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentAcceptLabelEn}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentAcceptLabelEn: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Reject label (DE/default)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentRejectLabel}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentRejectLabel: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
          <label className="tma-console-label">
            Reject label (EN)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentRejectLabelEn}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentRejectLabelEn: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <div className="tma-console-field-row">
          <label className="tma-console-label">
            Policy label (DE/default)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentPolicyLabel}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentPolicyLabel: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
          <label className="tma-console-label">
            Policy label (EN)
            <input
              type="text"
              className="tma-console-input"
              value={form.cookieConsentPolicyLabelEn}
              onChange={(e) => setForm((f) => ({ ...f, cookieConsentPolicyLabelEn: e.target.value }))}
              disabled={saving || readOnly}
            />
          </label>
        </div>
        <label className="tma-console-label">
          Policy URL
          <input
            type="text"
            className="tma-console-input"
            value={form.cookieConsentPolicyHref}
            onChange={(e) => setForm((f) => ({ ...f, cookieConsentPolicyHref: e.target.value }))}
            disabled={saving || readOnly}
          />
        </label>
      </fieldset>

      {canEditCustomCss ? (
        <fieldset className="tma-console-fieldset" style={{ marginTop: '1.5rem' }}>
          <legend className="tma-console-subheading">Advanced: site custom CSS</legend>
          <p className="tma-console-note" style={{ marginTop: 0 }}>
            Injected on the public site after design tokens. Avoid <code>&lt;script&gt;</code> and closing{' '}
            <code>&lt;/style&gt;</code>. Ops/admin only.
          </p>
          <label className="tma-console-label">
            Custom CSS
            <textarea
              className="tma-console-textarea-json"
              value={form.customCss}
              onChange={(e) => setForm((f) => ({ ...f, customCss: e.target.value }))}
              disabled={saving || readOnly}
              rows={8}
              spellCheck={false}
            />
          </label>
        </fieldset>
      ) : null}

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      {canEdit ? (
        <div className="tma-console-actions" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
