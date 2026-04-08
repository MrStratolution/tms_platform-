import Link from 'next/link'

import { resolveLocalizedDocument } from '@/lib/documentLocalization'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'

type FaqItem = { question: string; answer: string }
type PlanBullet = { text: string }
type PricingPlan = {
  name: string
  price: string
  description?: string | null
  bullets?: PlanBullet[] | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

type ProductDoc = {
  tagline?: string | null
  modules?: { title: string; body?: string | null }[] | null
  primaryCta?: { label?: string | null; href?: string | null } | null
  faqs?: FaqItem[] | null
  pricing?: {
    sectionTitle?: string | null
    intro?: string | null
    plans?: PricingPlan[] | null
  } | null
}

export function ProductPublicView(props: {
  name: string
  document: unknown
  locale?: PublicLocale
}) {
  const locale = props.locale ?? 'de'
  const rawDoc = (props.document && typeof props.document === 'object'
    ? props.document
    : {}) as Record<string, unknown>
  const doc = resolveLocalizedDocument(rawDoc, locale) as ProductDoc
  const modules = Array.isArray(doc.modules) ? doc.modules : []
  const cta = doc.primaryCta
  const faqs = Array.isArray(doc.faqs) ? doc.faqs : []
  const pricing = doc.pricing
  const plans = Array.isArray(pricing?.plans) ? pricing!.plans! : []
  const homeLabel = locale === 'en' ? 'Home' : 'Startseite'
  const emptyLabel =
    locale === 'en'
      ? 'No modules in this offer yet — edit in the console.'
      : 'Dieses Angebot hat noch keine Module. Bearbeite es in der Konsole.'
  const pricingLabel = locale === 'en' ? 'Pricing' : 'Preise'

  return (
    <article className="tma-product-public">
      <header className="tma-product-public__header">
        <p className="tma-product-public__eyebrow">
          <Link href={localizePublicHref('/', locale)}>{homeLabel}</Link>
        </p>
        <h1 className="tma-product-public__title">{props.name}</h1>
        {doc.tagline ? <p className="tma-product-public__tagline">{doc.tagline}</p> : null}
      </header>

      {modules.length > 0 ? (
        <ol className="tma-product-public__modules">
          {modules.map((m, i) => (
            <li key={`${m.title}-${i}`} className="tma-product-public__module">
              <h2>{m.title}</h2>
              {m.body ? <p>{m.body}</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="tma-product-public__empty">{emptyLabel}</p>
      )}

      {plans.length > 0 ? (
        <section className="tma-product-public__pricing" aria-labelledby="tma-product-pricing">
          <h2 id="tma-product-pricing" className="tma-product-public__section-title">
            {pricing?.sectionTitle?.trim() || pricingLabel}
          </h2>
          {pricing?.intro ? <p className="tma-product-public__section-intro">{pricing.intro}</p> : null}
          <ul className="tma-product-public__plans">
            {plans.map((plan, i) => (
              <li key={`${plan.name}-${i}`} className="tma-product-public__plan">
                <h3>{plan.name}</h3>
                <p className="tma-product-public__price">{plan.price}</p>
                {plan.description ? <p>{plan.description}</p> : null}
                {plan.bullets && plan.bullets.length > 0 ? (
                  <ul>
                    {plan.bullets.map((b, bi) => (
                      <li key={bi}>{b.text}</li>
                    ))}
                  </ul>
                ) : null}
                {plan.ctaLabel && plan.ctaHref ? (
                  <p>
                    <a
                      className="tma-btn tma-btn--secondary"
                      href={localizePublicHref(plan.ctaHref, locale)}
                    >
                      {plan.ctaLabel}
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="tma-product-public__faqs" aria-labelledby="tma-product-faq">
          <h2 id="tma-product-faq" className="tma-product-public__section-title">
            {locale === 'en' ? 'FAQs' : 'FAQ'}
          </h2>
          <div className="block-faq">
            {faqs.map((item, i) => (
              <details key={i} className="block-faq__item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {cta?.label && cta?.href ? (
        <p className="tma-product-public__cta">
          <a className="tma-btn tma-btn--primary" href={localizePublicHref(cta.href, locale)}>
            {cta.label}
          </a>
        </p>
      ) : null}
    </article>
  )
}
