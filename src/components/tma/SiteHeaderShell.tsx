'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useId, useState } from 'react'

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
  navConsole: string
  middleLinks: SiteHeaderLink[]
  langSwitcher: ReactNode
  /** Public site logo (path or https URL from site settings). */
  logoSrc?: string
  brandAlt?: string
  logoWidthDesktop?: number
  logoWidthMobile?: number
  /** Optional global header CTA (e.g. Book a call). */
  navCta?: SiteHeaderLink
  announcement?: { text: string; href?: string; style?: 'subtle' | 'highlight' | 'outline' }
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
  navConsole,
  middleLinks,
  langSwitcher,
  logoSrc = '/brand/tma-logo-white.png',
  brandAlt = 'The Modesty Argument',
  logoWidthDesktop = 220,
  logoWidthMobile = 132,
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
  const headerStyle = {
    ['--tma-header-logo-width-desktop' as const]: `${logoWidthDesktop}px`,
    ['--tma-header-logo-width-mobile' as const]: `${logoWidthMobile}px`,
  } as CSSProperties

  return (
    <div
      className={`tma-header-wrap${sticky ? ' tma-header-wrap--sticky' : ''}${
        transparentOnHero ? ' tma-header-wrap--transparent' : ''
      }`}
    >
      {announcement?.text ? (
        <div className={`tma-header__announcement tma-header__announcement--${announcement.style ?? 'subtle'}`}>
          {announcement.href ? (
            <Link href={announcement.href} className="tma-header__announcement-link">
              {announcement.text}
            </Link>
          ) : (
            <span className="tma-header__announcement-text">{announcement.text}</span>
          )}
        </div>
      ) : null}
      <header className={`tma-header tma-header--${layout}`} style={headerStyle}>
        <Link href={localizePublicHref('/', locale)} className="tma-header__brand" onClick={close}>
          <BrandLogo src={logoSrc} alt={brandAlt} />
        </Link>

        <div className="tma-header__end">
          <div className="tma-header__lang">{langSwitcher}</div>

          <nav className="tma-header__nav tma-header__nav--wide" aria-label="Primary">
            <Link href={localizePublicHref('/', locale)} className="tma-header__link">
              <span>{navHome}</span>
            </Link>
            {desktopLinks.map((item) => (
              <MiddleLink key={`${item.href}-${item.label}`} item={item} className="tma-header__link" />
            ))}
            {navCta ? (
              <MiddleLink item={navCta} className={`tma-header__link tma-header__nav-cta tma-header__nav-cta--${navCta.variant ?? 'primary'}`} />
            ) : null}
            <Link href="/console/login" className="tma-header__link">
              <span>{navConsole}</span>
            </Link>
          </nav>

          <button
            type="button"
            className="tma-header__menu-toggle"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
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
            aria-label="Close menu"
            onClick={close}
          />
        ) : null}

        <div
          id={menuId}
          className={`tma-header__drawer tma-header__drawer--${mobileBehavior}${open ? ' tma-header__drawer--open' : ''}`}
          role="dialog"
          aria-modal={open ? true : undefined}
          aria-label="Site menu"
          aria-hidden={!open}
          inert={!open}
        >
          <div className="tma-header__drawer-panel">
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
              {navCta ? (
                <MiddleLink
                  item={navCta}
                  className={`tma-header__drawer-link tma-header__drawer-link--cta tma-header__drawer-link--${navCta.variant ?? 'primary'}`}
                  onNavigate={close}
                />
              ) : null}
              <Link href="/console/login" className="tma-header__drawer-link" onClick={close}>
                <span>{navConsole}</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>
    </div>
  )
}
