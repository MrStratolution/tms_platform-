'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useId, useState } from 'react'

import { useScrollState } from '@/components/motion/useScrollState'
import { isNextLinkNavHref } from '@/lib/cms/navHref'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'

export type SiteHeaderLink = {
  href: string
  label: string
  badge?: string
  newTab?: boolean
  showOnDesktop?: boolean
  showOnMobile?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}

type Props = {
  navHome: string
  middleLinks: SiteHeaderLink[]
  desktopLangSwitcher: ReactNode
  mobileLangSwitcher: ReactNode
  /** Public site logo (path or https URL from site settings). */
  logoSrc?: string
  brandAlt?: string
  logoWidthDesktop?: number
  logoWidthMobile?: number
  /** Optional lighter utility CTA shown before the main header CTA. */
  navUtilityCta?: SiteHeaderLink
  /** Optional global header CTA (e.g. Book a call). */
  navCta?: SiteHeaderLink
  announcement?: {
    text: string
    href?: string
    style?: 'subtle' | 'highlight' | 'outline'
    mode?: 'static' | 'running'
    speed?: 'slow' | 'normal' | 'fast'
    pauseOnHover?: boolean
  }
  sticky?: boolean
  transparentOnHero?: boolean
  layout?: 'split' | 'centered'
  mobileBehavior?: 'drawer' | 'sheet'
  locale: PublicLocale
}

function BrandLogo({ src, alt }: { src: string; alt: string }) {
  const external = src.startsWith('http://') || src.startsWith('https://')
  if (external) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CMS may set external logo URL
      <img src={src} alt={alt} width={220} height={56} className="tma-header__logo" />
    )
  }
  return (
    <Image src={src} alt={alt} width={220} height={56} className="tma-header__logo" priority />
  )
}

export function SiteHeaderShell({
  navHome,
  middleLinks,
  desktopLangSwitcher,
  mobileLangSwitcher,
  logoSrc = '/brand/tma-logo-white.png',
  brandAlt = 'The Modesty Argument',
  logoWidthDesktop = 220,
  logoWidthMobile = 132,
  navUtilityCta,
  navCta,
  announcement,
  sticky = true,
  transparentOnHero = false,
  layout = 'split',
  mobileBehavior = 'drawer',
  locale,
}: Props) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const scroll = useScrollState({ threshold: transparentOnHero ? 18 : 10 })
  const closeMenuLabel = locale === 'de' ? 'Menü schließen' : 'Close menu'
  const backLabel = locale === 'de' ? 'Zurück' : 'Back'

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) close()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [close])

  function MiddleLink(props: {
    item: SiteHeaderLink
    className: string
    onNavigate?: () => void
  }) {
    const { item, className, onNavigate } = props
    if (isNextLinkNavHref(item.href)) {
      return (
        <Link
          href={item.href}
          className={className}
          onClick={onNavigate}
          target={item.newTab ? '_blank' : undefined}
          rel={item.newTab ? 'noreferrer noopener' : undefined}
        >
          <span>{item.label}</span>
          {item.badge ? <span className="tma-header__badge">{item.badge}</span> : null}
        </Link>
      )
    }
    return (
      <a
        href={item.href}
        className={className}
        onClick={onNavigate}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noreferrer noopener' : undefined}
      >
        <span>{item.label}</span>
        {item.badge ? <span className="tma-header__badge">{item.badge}</span> : null}
      </a>
    )
  }

  const desktopLinks = middleLinks.filter((item) => item.showOnDesktop !== false)
  const mobileLinks = middleLinks.filter((item) => item.showOnMobile !== false)
  const announcementRepeats = announcement?.text
    ? Array.from({ length: 4 }, (_, index) => `${announcement.text}__${index}`)
    : []
  const headerStyle = {
    ['--tma-header-logo-width-desktop' as const]: `${logoWidthDesktop}px`,
    ['--tma-header-logo-width-mobile' as const]: `${logoWidthMobile}px`,
  } as CSSProperties

  return (
    <div
      className={`tma-header-wrap${sticky ? ' tma-header-wrap--sticky' : ''}${
        transparentOnHero ? ' tma-header-wrap--transparent' : ''
      }${scroll.scrolled ? ' tma-header-wrap--scrolled' : ''}${
        scroll.direction === 'down' ? ' tma-header-wrap--scrolling-down' : ''
      }`}
    >
      {announcement?.text ? (
        <div
          className={`tma-header__announcement tma-header__announcement--${announcement.style ?? 'subtle'}${
            announcement.mode === 'running' ? ' tma-header__announcement--running' : ''
          }${announcement.pauseOnHover ? ' tma-header__announcement--pause-on-hover' : ''}`}
          data-speed={announcement.speed ?? 'normal'}
        >
          {announcement.href ? (
            <Link href={announcement.href} className="tma-header__announcement-link">
              <span className="tma-header__announcement-static">{announcement.text}</span>
              {announcement.mode === 'running' ? (
                <span className="tma-header__announcement-marquee" aria-hidden="true">
                  <span className="tma-header__announcement-track">
                    {announcementRepeats.map((key) => (
                      <span key={key} className="tma-header__announcement-item">
                        <span>{announcement.text}</span>
                        <span className="tma-header__announcement-separator" aria-hidden="true">
                          •
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              ) : null}
            </Link>
          ) : (
            <>
              <span className="tma-header__announcement-static">{announcement.text}</span>
              {announcement.mode === 'running' ? (
                <span className="tma-header__announcement-marquee" aria-hidden="true">
                  <span className="tma-header__announcement-track">
                    {announcementRepeats.map((key) => (
                      <span key={key} className="tma-header__announcement-item">
                        <span>{announcement.text}</span>
                        <span className="tma-header__announcement-separator" aria-hidden="true">
                          •
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <header className={`tma-header tma-header--${layout}`} style={headerStyle} data-scrolled={scroll.scrolled ? 'true' : 'false'}>
        <Link href={localizePublicHref('/', locale)} className="tma-header__brand" onClick={close}>
          <BrandLogo src={logoSrc} alt={brandAlt} />
        </Link>

        <div className="tma-header__end">
          <nav className="tma-header__nav tma-header__nav--wide" aria-label="Primary">
            <Link href={localizePublicHref('/', locale)} className="tma-header__link">
              <span>{navHome}</span>
            </Link>
            {desktopLinks.map((item) => (
              <MiddleLink key={`${item.href}-${item.label}`} item={item} className="tma-header__link" />
            ))}
            {navUtilityCta ? (
              <MiddleLink
                item={navUtilityCta}
                className={`tma-header__link tma-header__nav-cta tma-header__nav-cta--${navUtilityCta.variant ?? 'ghost'}`}
              />
            ) : null}
            {navCta ? (
              <MiddleLink item={navCta} className={`tma-header__link tma-header__nav-cta tma-header__nav-cta--${navCta.variant ?? 'primary'}`} />
            ) : null}
          </nav>

          {navCta ? (
            <MiddleLink
              item={navCta}
              className={`tma-header__link tma-header__nav-cta tma-header__nav-cta--${navCta.variant ?? 'primary'} tma-header__nav-cta--compact`}
            />
          ) : null}

          <div className="tma-header__lang tma-header__lang--desktop">{desktopLangSwitcher}</div>

          <button
            type="button"
            className="tma-header__menu-toggle"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? closeMenuLabel : 'Open menu'}</span>
            <span className="tma-header__burger" data-open={open ? 'true' : 'false'} aria-hidden>
              <span className="tma-header__burger-line" />
              <span className="tma-header__burger-line" />
              <span className="tma-header__burger-line" />
            </span>
          </button>
        </div>

        {open ? (
          <button
            type="button"
            className="tma-header__backdrop"
            tabIndex={-1}
            aria-label={closeMenuLabel}
            onClick={close}
          />
        ) : null}

        {open ? (
          <div
            id={menuId}
            className={`tma-header__drawer tma-header__drawer--${mobileBehavior} tma-header__drawer--open`}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="tma-header__drawer-panel">
              <div className="tma-header__drawer-topbar">
                <Link href={localizePublicHref('/', locale)} className="tma-header__drawer-brand" onClick={close}>
                  <BrandLogo src={logoSrc} alt={brandAlt} />
                </Link>
                <button type="button" className="tma-header__drawer-close" aria-label={closeMenuLabel} onClick={close}>
                  <span className="tma-header__drawer-close-icon" aria-hidden>
                    ←
                  </span>
                  <span>{backLabel}</span>
                </button>
              </div>
              <nav className="tma-header__drawer-nav" aria-label="Primary">
                <Link href={localizePublicHref('/', locale)} className="tma-header__drawer-link" onClick={close}>
                  <span>{navHome}</span>
                </Link>
                {mobileLinks.map((item) => (
                  <MiddleLink
                    key={`${item.href}-${item.label}`}
                    item={item}
                    className="tma-header__drawer-link"
                    onNavigate={close}
                  />
                ))}
                {navUtilityCta ? (
                  <MiddleLink
                    item={navUtilityCta}
                    className={`tma-header__drawer-link tma-header__drawer-link--cta tma-header__drawer-link--${navUtilityCta.variant ?? 'ghost'}`}
                    onNavigate={close}
                  />
                ) : null}
                {navCta ? (
                  <MiddleLink
                    item={navCta}
                    className={`tma-header__drawer-link tma-header__drawer-link--cta tma-header__drawer-link--${navCta.variant ?? 'primary'}`}
                    onNavigate={close}
                  />
                ) : null}
                <div className="tma-header__drawer-lang">{mobileLangSwitcher}</div>
              </nav>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  )
}
