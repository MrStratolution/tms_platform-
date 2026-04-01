'use client'

import { CtaButton } from '@/components/tma/CtaButton'

type Props = {
  label: string
  href: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

/** Fixed bottom CTA — last `stickyCta` block in layout wins (see PageView / PageLayout). */
export function StickyCtaBar({ label, href, variant = 'primary' }: Props) {
  return (
    <div className="tma-sticky-cta" role="region" aria-label="Call to action">
      <div className="tma-sticky-cta__inner">
        <CtaButton label={label} href={href} variant={variant} />
      </div>
    </div>
  )
}
