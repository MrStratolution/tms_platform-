import Link from 'next/link'
import { cookies, headers } from 'next/headers'

import { isNextLinkNavHref } from '@/lib/cms/navHref'
import { resolvePublicHtmlLang } from '@/lib/localeDirection'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { localizePublicHref, normalizePublicLocale } from '@/lib/publicLocale'
import type { SiteSettingsDocument } from '@/lib/siteSettings'
import { siteUiCopy } from '@/lib/siteUiCopy'

type Props = {
  site?: SiteSettingsDocument | null
}

export async function SiteFooter({ site = null }: Props) {
  const year = new Date().getFullYear()
  const headerStore = await headers()
  const cookieStore = await cookies()
  const uiLang = resolvePublicHtmlLang(
    headerStore.get('x-tma-active-lang'),
    cookieStore.get('tma_lang')?.value,
  )
  const locale = normalizePublicLocale(uiLang)
  const t = (key: Parameters<typeof siteUiCopy>[1]) => siteUiCopy(uiLang, key)

  const strapline =
    (locale === 'en'
      ? site?.footer?.straplineOverrideEn?.trim() || site?.footer?.straplineOverride?.trim()
      : site?.footer?.straplineOverride?.trim()) || t('footerStrapline')
  const legal = site?.footer?.legalLinks?.filter((l) => l.label?.trim() && l.href?.trim()) ?? []
  const contact = site?.footer?.contact ?? site?.contactInfo
  const social = site?.footer?.socialLinks ?? site?.socialLinks ?? []
  const ctaLabel =
    locale === 'en'
      ? site?.footer?.ctaLabelEn?.trim() || site?.footer?.ctaLabel?.trim()
      : site?.footer?.ctaLabel?.trim()
  const ctaHref = site?.footer?.ctaHref?.trim()
  const metaLine =
    locale === 'en'
      ? site?.footer?.metaLineEn?.trim() || site?.footer?.metaLine?.trim()
      : site?.footer?.metaLine?.trim()
  const logoSrc = absoluteMediaUrl(site?.footer?.logoUrl?.trim() || site?.branding?.logoLightUrl?.trim())
  const logoAlt = site?.footer?.logoAlt?.trim() || site?.branding?.siteName?.trim() || 'TMA'
  const footerLayout = site?.footer?.layout ?? 'columns'
  const footerLogoWidth = site?.footer?.logoWidth ?? 184

  return (
    <footer className={`tma-footer tma-footer--${footerLayout}`}>
      <div className="tma-footer__inner">
        <div className="tma-footer__brand-col">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={logoAlt}
              className="tma-footer__logo"
              style={{ width: `${footerLogoWidth}px` }}
            />
          ) : null}
          <p className="tma-footer__tagline">{strapline}</p>
          {ctaLabel && ctaHref ? (
            <p className="tma-footer__cta">
              <Link href={localizePublicHref(ctaHref, locale)} className={`tma-btn tma-btn--${site?.footer?.ctaStyle ?? 'primary'}`}>
                {ctaLabel}
              </Link>
            </p>
          ) : null}
        </div>
        {site?.footer?.showContact !== false && contact ? (
          <div className="tma-footer__contact">
            {contact.companyName ? <p className="tma-footer__contact-line">{contact.companyName}</p> : null}
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="tma-footer__contact-link">
                {contact.email}
              </a>
            ) : null}
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="tma-footer__contact-link">
                {contact.phone}
              </a>
            ) : null}
            {contact.address ? <p className="tma-footer__contact-line">{contact.address}</p> : null}
          </div>
        ) : null}
        <div className="tma-footer__meta-col">
          {site?.footer?.showSocialLinks !== false && social.length > 0 ? (
            <ul className="tma-footer__social-list">
              {social.map((link, index) => (
                <li key={`${link.url}-${index}`}>
                  <a
                    href={link.url}
                    className="tma-footer__social-link"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {link.label?.trim() || link.platform}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {legal.length > 0 ? (
            <nav className="tma-footer__legal" aria-label="Legal">
              <ul className="tma-footer__legal-list">
                {legal.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    {isNextLinkNavHref(l.href) ? (
                      <Link href={localizePublicHref(l.href, locale)} className="tma-footer__legal-link">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="tma-footer__legal-link">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div>
            <p className="tma-footer__meta">
              {metaLine || `© ${year} ${t('footerTagline')} — ${t('footerRights')}`}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
