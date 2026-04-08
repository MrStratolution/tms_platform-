import Link from 'next/link'

import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = {
  label: string
  href: string
  variant?: Variant
  className?: string
  locale?: PublicLocale
}

function isExternal(href: string) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  )
}

export function CtaButton({
  label,
  href,
  variant = 'primary',
  className = '',
  locale = 'de',
}: Props) {
  const cls = `tma-btn tma-btn--${variant}${variant !== 'ghost' ? ' tma-btn--with-arrow' : ''}${
    className ? ` ${className}` : ''
  }`
  const content = (
    <>
      <span className="tma-btn__label">{label}</span>
      {variant !== 'ghost' ? (
        <span className="tma-btn__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  )
  if (isExternal(href) || href.startsWith('#')) {
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    )
  }
  const path = href.startsWith('/') ? localizePublicHref(href, locale) : localizePublicHref(`/${href}`, locale)
  return (
    <Link href={path} className={cls}>
      {content}
    </Link>
  )
}
