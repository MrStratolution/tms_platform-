'use client'

import { useEffect, useMemo, useState } from 'react'

import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type { PublicLocale } from '@/lib/publicLocale'
import { CtaButton } from '@/components/tma/CtaButton'

type ServiceItem = {
  id?: string | null
  slug?: string | null
  title: string
  summary?: string | null
  bullets?: { id?: string | null; text: string }[] | null
  imageUrl?: string | null
  imageAlt?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

type Props = {
  sectionTitle?: string | null
  intro?: string | null
  items?: ServiceItem[] | null
  ctaLabel?: string | null
  ctaHref?: string | null
  locale?: PublicLocale
}

export function ServicesFocusBlock(props: Props) {
  const locale = props.locale ?? 'de'
  const labels =
    locale === 'en'
      ? {
          section: 'Services',
          categories: 'Service categories',
          eyebrow: 'Service focus',
        }
      : {
          section: 'Leistungen',
          categories: 'Leistungskategorien',
          eyebrow: 'Leistungsfokus',
        }
  const items = useMemo(
    () =>
      (props.items ?? []).filter(
        (item): item is ServiceItem =>
          !!item && typeof item.title === 'string' && item.title.trim().length > 0,
      ),
    [props.items],
  )
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
      if (!hash) return
      const nextIndex = items.findIndex((item) => item.slug?.trim().toLowerCase() === hash)
      if (nextIndex >= 0) setActiveIndex(nextIndex)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [items])

  if (items.length === 0) {
    return <p className="tma-muted">Add at least one service item in the CMS.</p>
  }

  const safeIndex = Math.min(Math.max(activeIndex, 0), items.length - 1)
  const active = items[safeIndex]
  const bullets = (active.bullets ?? []).filter((bullet) => bullet?.text?.trim())
  const mediaSrc =
    typeof active.imageUrl === 'string' && active.imageUrl.trim()
      ? absoluteMediaUrl(active.imageUrl.trim())
      : null
  const activeCtaLabel = active.ctaLabel?.trim() || props.ctaLabel?.trim() || ''
  const activeCtaHref = active.ctaHref?.trim() || props.ctaHref?.trim() || ''

  return (
    <section className="block-services-focus" aria-label={props.sectionTitle?.trim() || labels.section}>
      <div className="block-services-focus__header">
        {props.sectionTitle?.trim() ? (
          <h2 className="block-section__title">{props.sectionTitle.trim()}</h2>
        ) : null}
        {props.intro?.trim() ? (
          <p className="block-section__intro">{props.intro.trim()}</p>
        ) : null}
      </div>

      <div className="block-services-focus__layout">
        <div className="block-services-focus__nav" role="tablist" aria-label={labels.categories}>
          {items.map((item, index) => {
            const selected = index === safeIndex
            return (
              <button
                key={item.id ?? `${item.title}-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                id={item.slug?.trim() || undefined}
                className={`block-services-focus__tab${selected ? ' block-services-focus__tab--active' : ''}`}
                onClick={() => {
                  setActiveIndex(index)
                  if (typeof window !== 'undefined' && item.slug?.trim()) {
                    window.history.replaceState(null, '', `#${item.slug.trim()}`)
                  }
                }}
              >
                <span className="block-services-focus__tab-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="block-services-focus__tab-title">{item.title}</span>
              </button>
            )
          })}
        </div>

        <div
          className="block-services-focus__detail tma-surface-lift"
          role="tabpanel"
          aria-label={active.title}
        >
          <div className="block-services-focus__copy">
            <p className="block-services-focus__eyebrow">{labels.eyebrow}</p>
            <h3 className="block-services-focus__headline">{active.title}</h3>
            {active.summary?.trim() ? (
              <p className="block-services-focus__summary">{active.summary.trim()}</p>
            ) : null}
            {bullets.length > 0 ? (
              <ul className="block-services-focus__bullets">
                {bullets.map((bullet, index) => (
                  <li key={bullet.id ?? `${active.title}-bullet-${index}`}>
                    {bullet.text.trim()}
                  </li>
                ))}
              </ul>
            ) : null}
            {activeCtaLabel && activeCtaHref ? (
              <p className="block-services-focus__cta">
                <CtaButton
                  label={activeCtaLabel}
                  href={activeCtaHref}
                  variant="secondary"
                  locale={locale}
                />
              </p>
            ) : null}
          </div>

          <div className="block-services-focus__visual">
            {mediaSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc}
                alt={active.imageAlt?.trim() || active.title}
                width={900}
                height={1125}
                loading="lazy"
                className="block-services-focus__image"
              />
            ) : (
              <div className="block-services-focus__placeholder" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
