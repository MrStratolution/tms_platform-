import { cookies, headers } from 'next/headers'
import { Suspense } from 'react'

import { tryGetCmsDb } from '@/lib/cmsData'
import {
  getPublicNavLinksFromCms,
  getManualNavLinksFromSiteSettings,
  mergePublicNavLinks,
  getStaticNavFallbackOnly,
} from '@/lib/cms/publicNavLinks'
import { resolvePublicHtmlLang } from '@/lib/localeDirection'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { localizePublicHref, normalizePublicLocale } from '@/lib/publicLocale'
import type { SiteSettingsDocument } from '@/lib/siteSettings'
import { siteUiCopy } from '@/lib/siteUiCopy'

import { PublicLanguageSwitcher } from './PublicLanguageSwitcher'
import { SiteHeaderShell } from './SiteHeaderShell'

type Props = {
  site?: SiteSettingsDocument | null
}

export async function SiteHeader({ site = null }: Props) {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const uiLang = resolvePublicHtmlLang(
    headerStore.get('x-tma-active-lang'),
    cookieStore.get('tma_lang')?.value,
  )
  const locale = normalizePublicLocale(uiLang)
  const t = (key: Parameters<typeof siteUiCopy>[1]) => siteUiCopy(uiLang, key)

  let middleLinks: { href: string; label: string }[] = getStaticNavFallbackOnly()
  const manualLinks = getManualNavLinksFromSiteSettings(site, locale)
  let cmsLinks: { href: string; label: string }[] = []

  try {
    const cms = tryGetCmsDb()
    if (cms.ok) {
      cmsLinks = await getPublicNavLinksFromCms(cms.db)
    }
  } catch {
    /* DB down at build/runtime — keep fallback links */
  }
  middleLinks =
    manualLinks.length > 0
      ? mergePublicNavLinks(manualLinks, cmsLinks)
      : cmsLinks.length > 0
        ? cmsLinks
        : getStaticNavFallbackOnly()

  middleLinks = middleLinks.map((item) => ({
    ...item,
    href: localizePublicHref(item.href, locale),
  }))

  const logoLight = site?.header?.logoLightUrl?.trim() || site?.branding?.logoLightUrl?.trim()
  const logoSrc = absoluteMediaUrl(logoLight) || '/brand/tma-logo-white.png'
  const brandAlt =
    site?.header?.logoAlt?.trim() || site?.branding?.siteName?.trim() || 'The Modesty Argument'
  const navCta =
    site?.header?.navCtaLabel?.trim() && site?.header?.navCtaHref?.trim()
      ? {
          label:
            locale === 'en'
              ? site.header.navCtaLabelEn?.trim() || site.header.navCtaLabel.trim()
              : site.header.navCtaLabel.trim(),
          href: site.header.navCtaHref.trim(),
          variant: site.header.navCtaStyle ?? 'primary',
        }
      : undefined
  const navUtilityCta =
    site?.header?.navUtilityLabel?.trim() && site?.header?.navUtilityHref?.trim()
      ? {
          label:
            locale === 'en'
              ? site.header.navUtilityLabelEn?.trim() || site.header.navUtilityLabel.trim()
              : site.header.navUtilityLabel.trim(),
          href: site.header.navUtilityHref.trim(),
          variant: site.header.navUtilityStyle ?? 'ghost',
        }
      : undefined
  const announcement =
    site?.header?.announcement?.enabled && site.header.announcement.text?.trim()
      ? {
          text:
            locale === 'en'
              ? site.header.announcement.textEn?.trim() || site.header.announcement.text.trim()
              : site.header.announcement.text.trim(),
          href: site.header.announcement.href?.trim() || undefined,
          style: site.header.announcement.style ?? 'subtle',
          mode: site.header.announcement.mode ?? 'static',
          speed: site.header.announcement.speed ?? 'normal',
          pauseOnHover: site.header.announcement.pauseOnHover !== false,
        }
      : undefined

  return (
    <SiteHeaderShell
      navHome={t('navHome')}
      middleLinks={middleLinks}
      desktopLangSwitcher={
        <Suspense fallback={null}>
          <PublicLanguageSwitcher label={t('langLabel')} currentLocale={uiLang} />
        </Suspense>
      }
      mobileLangSwitcher={
        <Suspense fallback={null}>
          <PublicLanguageSwitcher label={t('langLabel')} currentLocale={uiLang} />
        </Suspense>
      }
      logoSrc={logoSrc}
      brandAlt={brandAlt}
      logoWidthDesktop={site?.header?.logoWidthDesktop ?? 220}
      logoWidthMobile={site?.header?.logoWidthMobile ?? 132}
      navUtilityCta={
        navUtilityCta
          ? { ...navUtilityCta, href: localizePublicHref(navUtilityCta.href, locale) }
          : undefined
      }
      navCta={navCta ? { ...navCta, href: localizePublicHref(navCta.href, locale) } : undefined}
      announcement={
        announcement
          ? {
              ...announcement,
              href: announcement.href ? localizePublicHref(announcement.href, locale) : undefined,
            }
          : undefined
      }
      sticky={site?.header?.sticky !== false}
      transparentOnHero={site?.header?.transparentOnHero === true}
      layout={site?.header?.layout ?? 'split'}
      mobileBehavior={site?.header?.mobileBehavior ?? 'drawer'}
      locale={locale}
    />
  )
}
