'use client'

import { CtaButton } from '@/components/tma/CtaButton'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type { PublicLocale } from '@/lib/publicLocale'
import type { Industry } from '@/types/cms'

import { normalizeIndustryMessaging } from '@/lib/contentLibraryShapes'

type Props = {
  sectionTitle?: string | null
  intro?: string | null
  industries?: (number | Industry)[] | null
  ctaLabel?: string | null
  ctaHref?: string | null
  locale?: PublicLocale
}

function isPopulatedIndustry(value: number | Industry): value is Industry {
  return typeof value === 'object' && value != null && 'name' in value
}

export function IndustryGridBlock(props: Props) {
  const locale = props.locale ?? 'de'
  const items = (props.industries ?? []).filter(isPopulatedIndustry)

  if (items.length === 0) {
    return <p className="tma-muted">Add active industry entries in the CMS to populate this section.</p>
  }

  return (
    <section className="block-industry-grid" aria-label={props.sectionTitle?.trim() || 'Industries'}>
      {props.sectionTitle?.trim() ? <h2 className="block-section__title">{props.sectionTitle.trim()}</h2> : null}
      {props.intro?.trim() ? <p className="block-section__intro">{props.intro.trim()}</p> : null}

      <div className="block-industry-grid__grid">
        {items.map((industry) => {
          const messaging = normalizeIndustryMessaging(industry.messaging)
          const cardCtaLabel = messaging.ctaLabel?.trim() || props.ctaLabel?.trim() || ''
          const cardCtaHref = messaging.ctaHref?.trim() || props.ctaHref?.trim() || ''
          const visualSrc =
            typeof messaging.imageUrl === 'string' && messaging.imageUrl.trim()
              ? absoluteMediaUrl(messaging.imageUrl.trim()) ?? messaging.imageUrl.trim()
              : null
          const visualAlt =
            typeof messaging.imageAlt === 'string' && messaging.imageAlt.trim()
              ? messaging.imageAlt.trim()
              : industry.name

          return (
            <article
              key={industry.id}
              id={industry.slug}
              className="block-industry-grid__card tma-surface-lift"
            >
              <div className="block-industry-grid__content">
                <p className="block-industry-grid__eyebrow">{industry.slug.replace(/-/g, ' ')}</p>
                <h3 className="block-industry-grid__title">{industry.name}</h3>
                {industry.summary?.trim() ? (
                  <p className="block-industry-grid__summary">{industry.summary.trim()}</p>
                ) : null}
                {messaging.positioning ? (
                  <p className="block-industry-grid__positioning">{messaging.positioning}</p>
                ) : null}
                {messaging.challenges && messaging.challenges.length > 0 ? (
                  <ul className="block-industry-grid__list">
                    {messaging.challenges.map((challenge) => (
                      <li key={`${industry.id}-challenge-${challenge}`}>{challenge}</li>
                    ))}
                  </ul>
                ) : null}
                {messaging.opportunities && messaging.opportunities.length > 0 ? (
                  <ul className="block-industry-grid__list block-industry-grid__list--secondary">
                    {messaging.opportunities.map((item) => (
                      <li key={`${industry.id}-opportunity-${item}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {cardCtaLabel && cardCtaHref ? (
                  <p className="block-industry-grid__cta">
                    <CtaButton label={cardCtaLabel} href={cardCtaHref} variant="ghost" locale={locale} />
                  </p>
                ) : null}
              </div>
              {visualSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={visualSrc}
                  alt={visualAlt}
                  width={960}
                  height={720}
                  loading="lazy"
                  className="block-industry-grid__image"
                />
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
