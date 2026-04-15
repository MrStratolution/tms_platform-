import Link from 'next/link'

import { resolveLocalizedDocument } from '@/lib/documentLocalization'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'
import {
  asProductDocument,
  productAspectRatioClass,
  productVideoOptions,
  type ProductDocument,
  type ProductGalleryItem,
} from '@/lib/productDocument'
import { isLikelyEmbeddableVideoUrl, toVideoEmbedUrl } from '@/lib/videoEmbed'

function asRenderableSrc(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed
  return `/${trimmed.replace(/^\/+/, '')}`
}

function renderVideoSurface(props: {
  src: string
  poster?: string | null
  title: string
  className?: string
  controls?: boolean
  muted?: boolean
  autoplay?: boolean
  loop?: boolean
}) {
  const src = asRenderableSrc(props.src)
  if (!src) return null

  if (isLikelyEmbeddableVideoUrl(src)) {
    return (
      <iframe
        className={props.className}
        src={toVideoEmbedUrl(src, {
          autoplay: props.autoplay,
          muted: props.muted,
          loop: props.loop,
          controls: props.controls,
        })}
        title={props.title}
        allow="autoplay; fullscreen; picture-in-picture"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    )
  }

  return (
    <video
      className={props.className}
      src={src}
      poster={asRenderableSrc(props.poster) ?? undefined}
      controls={props.controls !== false}
      muted={props.muted === true}
      autoPlay={props.autoplay === true}
      loop={props.loop === true}
      playsInline
      preload="metadata"
    />
  )
}

function ProductGalleryCard(props: { item: ProductGalleryItem; index: number; locale: PublicLocale }) {
  const item = props.item
  const caption =
    item.caption?.trim() ||
    (item.mediaMode === 'video'
      ? props.locale === 'en'
        ? `Gallery video ${props.index + 1}`
        : `Galerie-Video ${props.index + 1}`
      : null)
  const alt =
    item.imageAlt?.trim() ||
    (props.locale === 'en'
      ? `Product gallery image ${props.index + 1}`
      : `Produktgalerie Bild ${props.index + 1}`)

  return (
    <li className="tma-product-public__gallery-item">
      {item.mediaMode === 'video' && item.videoUrl ? (
        <div className="tma-product-public__gallery-visual tma-product-public__media tma-product-public__media--landscape">
          {renderVideoSurface({
            src: item.videoUrl,
            poster: item.posterUrl,
            title: caption || alt,
            className: 'tma-product-public__gallery-video',
            controls: true,
            muted: true,
          })}
        </div>
      ) : item.imageUrl ? (
        <div className="tma-product-public__gallery-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asRenderableSrc(item.imageUrl) ?? undefined} alt={alt} />
        </div>
      ) : null}
      {caption ? <p className="tma-product-public__gallery-caption">{caption}</p> : null}
    </li>
  )
}

export function ProductPublicView(props: {
  name: string
  document: unknown
  locale?: PublicLocale
}) {
  const locale = props.locale ?? 'de'
  const rawDoc = asProductDocument(props.document)
  const doc = resolveLocalizedDocument(rawDoc, locale) as ProductDocument
  const modules = Array.isArray(doc.modules) ? doc.modules : []
  const cta = doc.primaryCta
  const faqs = Array.isArray(doc.faqs) ? doc.faqs : []
  const pricing = doc.pricing
  const plans = Array.isArray(pricing?.plans) ? pricing!.plans! : []
  const galleryItems = Array.isArray(doc.galleryItems) ? doc.galleryItems : []
  const galleryTitle = doc.galleryTitle?.trim() || (locale === 'en' ? 'Gallery' : 'Galerie')
  const heroMediaMode = doc.heroMediaMode === 'video' ? 'video' : 'image'
  const heroCaption = doc.heroVideoCaption?.trim()
  const showcase = doc.videoShowcase ?? null
  const showcaseOptions = productVideoOptions(showcase)
  const showcaseSource =
    showcase?.sourceType === 'external'
      ? showcase.externalUrl?.trim() || null
      : showcase?.uploadedVideoUrl?.trim() || null
  const homeLabel = locale === 'en' ? 'Home' : 'Startseite'
  const emptyLabel =
    locale === 'en'
      ? 'No modules in this offer yet — edit in the console.'
      : 'Dieses Angebot hat noch keine Module. Bearbeite es in der Konsole.'
  const pricingLabel = locale === 'en' ? 'Pricing' : 'Preise'
  const videoLabel = locale === 'en' ? 'Video showcase' : 'Video-Showcase'
  const galleryAltFallback =
    locale === 'en' ? `Cover image for ${props.name}` : `Titelbild für ${props.name}`
  const heroVisualTitle = locale === 'en' ? `${props.name} hero video` : `${props.name} Hero-Video`

  return (
    <article className="tma-product-public">
      <header className="tma-product-public__header">
        <p className="tma-product-public__eyebrow">
          <Link href={localizePublicHref('/', locale)}>{homeLabel}</Link>
        </p>
        <div className="tma-product-public__hero">
          <div className="tma-product-public__hero-copy">
            <h1 className="tma-product-public__title">{props.name}</h1>
            {doc.tagline ? <p className="tma-product-public__tagline">{doc.tagline}</p> : null}
            {cta?.label && cta?.href ? (
              <p className="tma-product-public__cta tma-product-public__cta--hero">
                <a className="tma-btn tma-btn--primary" href={localizePublicHref(cta.href, locale)}>
                  {cta.label}
                </a>
              </p>
            ) : null}
          </div>
          {heroMediaMode === 'video' && doc.heroVideoUrl ? (
            <figure className="tma-product-public__hero-media">
              <div className="tma-product-public__media tma-product-public__media--landscape">
                {renderVideoSurface({
                  src: doc.heroVideoUrl,
                  poster: doc.heroVideoPosterUrl,
                  title: heroVisualTitle,
                  className: 'tma-product-public__hero-video',
                  controls: true,
                  muted: true,
                })}
              </div>
              {heroCaption ? <figcaption className="tma-product-public__hero-caption">{heroCaption}</figcaption> : null}
            </figure>
          ) : doc.coverImageUrl ? (
            <figure className="tma-product-public__hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="tma-product-public__hero-image"
                src={asRenderableSrc(doc.coverImageUrl) ?? undefined}
                alt={doc.coverImageAlt?.trim() || galleryAltFallback}
              />
            </figure>
          ) : null}
        </div>
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

      {galleryItems.length > 0 ? (
        <section className="tma-product-public__gallery" aria-labelledby="tma-product-gallery">
          <h2 id="tma-product-gallery" className="tma-product-public__section-title">
            {galleryTitle}
          </h2>
          {doc.galleryIntro ? <p className="tma-product-public__section-intro">{doc.galleryIntro}</p> : null}
          <ul className="tma-product-public__gallery-grid">
            {galleryItems.map((item, index) => (
              <ProductGalleryCard
                key={item.id ?? `${item.mediaMode}-${index}`}
                item={item}
                index={index}
                locale={locale}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {showcaseSource ? (
        <section className="tma-product-public__video-showcase" aria-labelledby="tma-product-video-showcase">
          <div className="tma-product-public__video-copy">
            {showcase?.eyebrow ? <p className="tma-product-public__eyebrow">{showcase.eyebrow}</p> : null}
            <h2 id="tma-product-video-showcase" className="tma-product-public__section-title">
              {showcase?.title?.trim() || videoLabel}
            </h2>
            {showcase?.description ? (
              <p className="tma-product-public__section-intro">{showcase.description}</p>
            ) : null}
            {showcase?.caption ? (
              <p className="tma-product-public__video-caption">{showcase.caption}</p>
            ) : null}
            {showcase?.ctaLabel && showcase?.ctaHref ? (
              <p className="tma-product-public__cta">
                <a
                  className="tma-btn tma-btn--secondary"
                  href={localizePublicHref(showcase.ctaHref, locale)}
                >
                  {showcase.ctaLabel}
                </a>
              </p>
            ) : null}
          </div>
          <div
            className={`tma-product-public__media ${productAspectRatioClass(
              showcase?.aspectRatio,
            )}`}
          >
            {renderVideoSurface({
              src: showcaseSource,
              poster: showcase?.posterUrl,
              title: showcase?.title?.trim() || videoLabel,
              className: 'tma-product-public__showcase-video',
              controls: showcaseOptions.controls,
              muted: showcaseOptions.muted,
              autoplay: showcaseOptions.autoplay,
              loop: showcaseOptions.loop,
            })}
          </div>
        </section>
      ) : null}

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
    </article>
  )
}
