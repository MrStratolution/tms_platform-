import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = {
  label: string
  href: string
  variant?: Variant
  className?: string
}

function isExternal(href: string) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  )
}

export function CtaButton({ label, href, variant = 'primary', className = '' }: Props) {
  const cls = `tma-btn tma-btn--${variant}${className ? ` ${className}` : ''}`
  if (isExternal(href)) {
    return (
      <a href={href} className={cls}>
        {label}
      </a>
    )
  }
  const path = href.startsWith('/') ? href : `/${href}`
  return (
    <Link href={path} className={cls}>
      {label}
    </Link>
  )
}
