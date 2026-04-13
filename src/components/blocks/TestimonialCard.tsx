'use client'

import { ChevronDown } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import type { PublicLocale } from '@/lib/publicLocale'

type Props = {
  quote: string
  locale: PublicLocale
  children?: ReactNode
}

function splitQuote(quote: string, limit: number) {
  const words = quote.trim().split(/\s+/).filter(Boolean)
  if (words.length <= limit) {
    return {
      truncated: false,
      preview: quote.trim(),
      full: quote.trim(),
    }
  }
  return {
    truncated: true,
    preview: `${words.slice(0, limit).join(' ')}…`,
    full: quote.trim(),
  }
}

export function TestimonialCard(props: Props) {
  const { quote, locale, children } = props
  const [expanded, setExpanded] = useState(false)
  const labels = locale === 'en'
    ? { more: 'Read more', less: 'Less' }
    : { more: 'Mehr lesen', less: 'Weniger' }

  const copy = useMemo(() => splitQuote(quote, 25), [quote])

  return (
    <blockquote className="block-testimonials__entry-quote">
      <p>{expanded || !copy.truncated ? copy.full : copy.preview}</p>
      {copy.truncated ? (
        <button
          type="button"
          className={`block-testimonials__toggle${expanded ? ' block-testimonials__toggle--open' : ''}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>{expanded ? labels.less : labels.more}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      ) : null}
      {children}
    </blockquote>
  )
}
