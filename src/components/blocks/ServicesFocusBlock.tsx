'use client'

import { useMemo, useState } from 'react'

import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type { PublicLocale } from '@/lib/publicLocale'
import { CtaButton } from '@/components/tma/CtaButton'

type ServiceItem = {
  id?: string | null
  title: string
  summary?: string | null
  bullets?: { id?: string | null; text: string }[] | null
  imageUrl?: string | null
  imageAlt?: string | null
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
  const items = useMemo(
    () =>
      (props.items ?? []).filter(
        (item): item is ServiceItem =>
          !!item && typeof item.title === 'string' && item.title.trim().length > 0,
      ),
    [props.items],
  )
  const [activeIndex, setActiveIndex] = useState(0)

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

  return (
    <section className="block-services-focus" aria-label={props.sectionTitle?.trim() || 'Services'}>
      <div className="block-services-focus__header">
        {props.sectionTitle?.trim() ? (
          <h2 className="block-section__title">{props.sectionTitle.trim()}</h2>
        ) : null}
        {props.intro?.trim() ? (
          <p className="block-section__intro">{props.intro.trim()}</p>
        ) : null}
      </div>

      <div className="block-services-focus__layout">
        <div className="block-services-focus__nav" role="tablist" aria-label="Service categories">
          {items.map((item, index) => {
            const selected = index === safeIndex
            return (
              <button
                key={item.id ?? `${item.title}-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`block-services-focus__tab${selected ? ' block-services-focus__tab--active' : ''}`}
                onClick={() => setActiveIndex(index)}
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
            <p className="block-services-focus__eyebrow">Service focus</p>
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
            {props.ctaLabel?.trim() && props.ctaHref?.trim() ? (
              <p className="block-services-focus__cta">
                <CtaButton
                  label={props.ctaLabel.trim()}
                  href={props.ctaHref.trim()}
                  variant="secondary"
                  locale={props.locale ?? 'de'}
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
