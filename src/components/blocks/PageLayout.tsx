import type { SerializedEditorState } from 'lexical'
import type { CSSProperties, ReactNode } from 'react'

import { LexicalRichReadonly } from '@/components/cms/LexicalRichReadonly'
import { applyRichTextShortcodes } from '@/lib/cms/richTextShortcodes'
import {
  resolveSectionSpacingStyle,
  resolveSectionWidthClass,
  sectionChromeFromBlock,
} from '@/lib/cms/resolveSectionPresentation'
import { Reveal } from '@/components/motion/Reveal'
import { AnimatedStats } from '@/components/tma/AnimatedStats'
import { CtaButton } from '@/components/tma/CtaButton'
import { HeroBackdrop } from '@/components/tma/HeroBackdrop'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type {
  BookingProfile,
  CaseStudy,
  FormConfig,
  Industry,
  Media,
  Page,
  TeamMember,
  Testimonial,
} from '@/types/cms'

import { toVideoEmbedUrl, isLikelyEmbeddableVideoUrl } from '@/lib/videoEmbed'

import { BookingBlock } from './BookingBlock'
import { FormBlock } from './FormBlock'
import { StickyCtaBar } from './StickyCtaBar'

type LayoutBlock = NonNullable<Page['layout']>[number]

function isPopulatedMedia(m: number | Media): m is Media {
  return typeof m === 'object' && m != null && 'url' in m
}

function isPopulatedTestimonial(t: number | Testimonial): t is Testimonial {
  return typeof t === 'object' && t != null && 'quote' in t
}

function isPopulatedTeamMember(m: number | TeamMember): m is TeamMember {
  return typeof m === 'object' && m != null && 'name' in m
}

function isPopulatedCaseStudy(s: number | CaseStudy): s is CaseStudy {
  return typeof s === 'object' && s != null && 'title' in s
}

function isPopulatedIndustry(i: number | Industry): i is Industry {
  return typeof i === 'object' && i != null && 'name' in i
}

const CADENCE_LABEL: Record<string, string> = {
  monthly: '/mo',
  annual: '/yr',
  once: ' one-time',
  custom: '',
}

function ResponsiveImage(props: {
  src: string
  alt: string
  width: number
  height: number
  tabletSrc?: string
  mobileSrc?: string
  loading?: 'lazy' | 'eager'
  className?: string
  imgStyle?: CSSProperties
}) {
  const { src, alt, width, height, tabletSrc, mobileSrc, loading = 'lazy', className, imgStyle } = props
  if (!tabletSrc && !mobileSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} loading={loading} className={className} style={imgStyle} />
  }
  return (
    <picture>
      {mobileSrc ? <source media="(max-width: 768px)" srcSet={mobileSrc} /> : null}
      {tabletSrc ? <source media="(max-width: 1024px)" srcSet={tabletSrc} /> : null}
      <img src={src} alt={alt} width={width} height={height} loading={loading} className={className} style={imgStyle} />
    </picture>
  )
}

function normalizeMediaWidth(raw: unknown): 'narrow' | 'default' | 'wide' | 'full' {
  return raw === 'narrow' || raw === 'wide' || raw === 'full' ? raw : 'default'
}

function normalizeAspectRatio(raw: unknown): string | undefined {
  switch (raw) {
    case 'square':
      return '1 / 1'
    case 'portrait':
      return '4 / 5'
    case 'landscape':
      return '16 / 10'
    case 'cinema':
      return '16 / 9'
    default:
      return undefined
  }
}

function normalizeRadius(raw: unknown): string | undefined {
  switch (raw) {
    case 'none':
      return '0'
    case 'sm':
      return '0.375rem'
    case 'md':
      return '0.75rem'
    case 'lg':
      return '1.25rem'
    case 'pill':
      return '999px'
    default:
      return undefined
  }
}

function normalizeMediaMaxWidth(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

function normalizeObjectPosition(posX: unknown, posY: unknown): string {
  const x = posX === 'left' || posX === 'right' ? posX : 'center'
  const y = posY === 'top' || posY === 'bottom' ? posY : 'center'
  return `${x} ${y}`
}

function mediaWidthStyle(width: 'narrow' | 'default' | 'wide' | 'full'): CSSProperties {
  if (width === 'full') {
    return { width: '100%', maxWidth: '100%' }
  }
  return {
    width: '100%',
    maxWidth: width === 'narrow' ? '28rem' : width === 'wide' ? '56rem' : '42rem',
  }
}

function mediaAlignStyle(align: unknown): CSSProperties {
  switch (align) {
    case 'left':
      return { marginLeft: 0, marginRight: 'auto' }
    case 'right':
      return { marginLeft: 'auto', marginRight: 0 }
    default:
      return { marginLeft: 'auto', marginRight: 'auto' }
  }
}

function mediaHeightStyle(raw: unknown): CSSProperties {
  switch (raw) {
    case 'short':
      return { minHeight: '14rem' }
    case 'medium':
      return { minHeight: '20rem' }
    case 'tall':
      return { minHeight: '28rem' }
    default:
      return {}
  }
}

function SectionOuter(props: { page: Page; block: LayoutBlock; children: ReactNode }) {
  const { page, block, children } = props
  const chrome = sectionChromeFromBlock(block)
  if (chrome.sectionHidden) return null
  const baseStyle = resolveSectionSpacingStyle(page, chrome)
  const widthClass = resolveSectionWidthClass(page, chrome)
  const anchor = chrome.anchorId?.trim().replace(/^#/, '')
  const extra = chrome.customClass?.trim()
  const responsiveHide = [
    chrome.hideOnDesktop ? 'tma-hide-desktop' : '',
    chrome.hideOnMobile ? 'tma-hide-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const raw = block as unknown as Record<string, unknown>
  const blockStyle: Record<string, string | number | undefined> = { ...baseStyle }
  if (typeof raw.textAlign === 'string') blockStyle.textAlign = raw.textAlign
  if (typeof raw.bgColor === 'string' && raw.bgColor) blockStyle.backgroundColor = raw.bgColor
  if (typeof raw.bgImageUrl === 'string' && raw.bgImageUrl) {
    const safeUrl = raw.bgImageUrl.replace(/["\\()]/g, '')
    blockStyle.backgroundImage = `url("${safeUrl}")`
    blockStyle.backgroundSize = 'cover'
    blockStyle.backgroundPosition = 'center'
  }
  if (typeof raw.textColor === 'string' && raw.textColor) blockStyle.color = raw.textColor
  if (typeof raw.opacity === 'number' && raw.opacity < 100) blockStyle.opacity = raw.opacity / 100
  if (typeof raw.marginTop === 'string' && raw.marginTop) blockStyle.marginTop = raw.marginTop
  if (typeof raw.marginBottom === 'string' && raw.marginBottom) blockStyle.marginBottom = raw.marginBottom
  if (typeof raw.paddingTop === 'string' && raw.paddingTop) blockStyle.paddingTop = raw.paddingTop
  if (typeof raw.paddingBottom === 'string' && raw.paddingBottom) blockStyle.paddingBottom = raw.paddingBottom
  if (typeof raw.marginLeft === 'string' && raw.marginLeft) blockStyle.marginLeft = raw.marginLeft
  if (typeof raw.marginRight === 'string' && raw.marginRight) blockStyle.marginRight = raw.marginRight
  if (typeof raw.paddingLeft === 'string' && raw.paddingLeft) blockStyle.paddingLeft = raw.paddingLeft
  if (typeof raw.paddingRight === 'string' && raw.paddingRight) blockStyle.paddingRight = raw.paddingRight
  if (typeof raw.zIndex === 'number') blockStyle.zIndex = raw.zIndex
  const brMap: Record<string, string> = { sm: '0.375rem', md: '0.75rem', lg: '1.25rem', full: '999px' }
  if (typeof raw.borderRadius === 'string' && brMap[raw.borderRadius]) {
    blockStyle.borderRadius = brMap[raw.borderRadius]
    blockStyle.overflow = 'hidden'
  }

  const themeClass = raw.sectionTheme === 'light' ? 'tma-theme-light' : raw.sectionTheme === 'dark' ? 'tma-theme-dark' : ''
  const cls = `tma-block-outer ${widthClass}${extra ? ` ${extra}` : ''}${responsiveHide ? ` ${responsiveHide}` : ''}${themeClass ? ` ${themeClass}` : ''}`.trim()
  return (
    <div
      id={anchor || undefined}
      data-tma-block-id={typeof block.id === 'string' ? block.id : undefined}
      className={cls}
      style={blockStyle}
    >
      {children}
    </div>
  )
}

function renderBlock(
  block: LayoutBlock,
  page: Page,
  embedShortcodeVars?: Record<string, string>,
) {
  switch (block.blockType) {
    case 'hero': {
      const media =
        typeof block.backgroundMedia === 'object' && block.backgroundMedia != null
          ? block.backgroundMedia
          : undefined
      const mediaUrl =
        typeof block.backgroundMediaUrl === 'string' && block.backgroundMediaUrl.trim()
          ? absoluteMediaUrl(block.backgroundMediaUrl.trim()) ?? undefined
          : undefined
      return (
        <HeroBackdrop
          size="block"
          title={block.headline}
          lead={block.subheadline}
          media={media}
          mediaUrl={mediaUrl}
          ctaLabel={block.ctaLabel}
          ctaHref={block.ctaHref}
          headingId={block.id ? `tma-hero-${block.id}` : 'tma-block-hero-heading'}
          tabletImageUrl={block.tabletImageUrl}
          mobileImageUrl={block.mobileImageUrl}
          height={block.height}
          mediaFit={block.mediaFit}
          mediaPositionX={block.mediaPositionX}
          mediaPositionY={block.mediaPositionY}
        />
      )
    }
    case 'cta':
      return (
        <p className="block-cta">
          <CtaButton
            label={block.label}
            href={block.href}
            variant={block.variant ?? 'primary'}
          />
        </p>
      )
    case 'promoBanner': {
      const v =
        block.variant === 'dark' ||
        block.variant === 'outline' ||
        block.variant === 'gradient' ||
        block.variant === 'lime'
          ? block.variant
          : 'lime'
      const align = block.align === 'center' ? 'center' : 'left'
      const headline = block.headline?.trim()
      if (!headline) {
        return <p className="tma-muted">Add a headline for this promo banner in the CMS.</p>
      }
      const eyebrow = block.eyebrow?.trim()
      const body = block.body?.trim()
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()
      const headingId =
        typeof block.id === 'string' && block.id.trim() ? `tma-promo-${block.id.trim()}` : undefined
      return (
        <aside
          className={`block-promo-banner block-promo-banner--${v} block-promo-banner--align-${align}`}
          aria-labelledby={headingId}
        >
          <div className="block-promo-banner__inner">
            {eyebrow ? <p className="block-promo-banner__eyebrow">{eyebrow}</p> : null}
            <h2 className="block-promo-banner__headline" id={headingId}>
              {headline}
            </h2>
            {body ? <p className="block-promo-banner__body">{body}</p> : null}
            {ctaLabel && ctaHref ? (
              <p className="block-promo-banner__cta">
                <CtaButton label={ctaLabel} href={ctaHref} variant="primary" />
              </p>
            ) : null}
          </div>
        </aside>
      )
    }
    case 'imageBanner': {
      const src = block.imageUrl?.trim() ? absoluteMediaUrl(block.imageUrl.trim()) : null
      if (!src) {
        return <p className="tma-muted">Add an image URL for this banner in the CMS.</p>
      }
      const ov =
        block.overlay === 'strong' || block.overlay === 'light' || block.overlay === 'medium'
          ? block.overlay
          : 'medium'
      const h =
        block.height === 'short' || block.height === 'tall' || block.height === 'medium'
          ? block.height
          : 'medium'
      const headline = block.headline?.trim()
      const sub = block.subheadline?.trim()
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()
      const headingId =
        typeof block.id === 'string' && block.id.trim() ? `tma-img-banner-${block.id.trim()}` : undefined
      const imgAlt = block.imageAlt?.trim() ?? ''
      const mediaWidth = normalizeMediaWidth(block.mediaWidth)
      const mediaStyle: CSSProperties = {
        ...mediaWidthStyle(mediaWidth),
        ...mediaAlignStyle(block.mediaAlign),
        ...mediaHeightStyle(block.height),
      }
      if (mediaWidth !== 'full') {
        mediaStyle.maxWidth = normalizeMediaMaxWidth(block.maxMediaWidth) ?? mediaStyle.maxWidth
      }
      const outerStyle: CSSProperties = { ...mediaStyle }
      const aspectRatio = normalizeAspectRatio(block.aspectRatio)
      if (aspectRatio) outerStyle.aspectRatio = aspectRatio
      const maxHeight = normalizeMediaMaxWidth(block.maxMediaHeight)
      if (maxHeight) outerStyle.maxHeight = maxHeight
      const radius = normalizeRadius(block.borderRadius)
      if (radius) outerStyle.borderRadius = radius
      const mediaFit = block.mediaFit === 'contain' ? 'contain' : 'cover'
      const imgStyle: CSSProperties = {
        objectFit: mediaFit,
        objectPosition: normalizeObjectPosition(block.mediaPositionX, block.mediaPositionY),
      }
      return (
        <div
          className={`block-image-banner block-image-banner--h-${h} block-image-banner--overlay-${ov}${
            mediaWidth !== 'full' ? ' block-image-banner--contained' : ''
          }`}
          style={outerStyle}
          role="region"
          aria-labelledby={headline ? headingId : undefined}
          aria-label={headline ? undefined : imgAlt || 'Featured banner'}
        >
          <div className="block-image-banner__media">
            <ResponsiveImage
              src={src}
              alt={imgAlt}
              width={1600}
              height={600}
              tabletSrc={block.tabletImageUrl ? (absoluteMediaUrl(block.tabletImageUrl) ?? undefined) : undefined}
              mobileSrc={block.mobileImageUrl ? (absoluteMediaUrl(block.mobileImageUrl) ?? undefined) : undefined}
              imgStyle={imgStyle}
            />
          </div>
          <div className="block-image-banner__scrim" aria-hidden="true" />
          <div className="block-image-banner__inner">
            {headline ? (
              <h2 className="block-image-banner__headline" id={headingId}>
                {headline}
              </h2>
            ) : null}
            {sub ? <p className="block-image-banner__sub">{sub}</p> : null}
            {ctaLabel && ctaHref ? (
              <p className="block-image-banner__cta">
                <CtaButton label={ctaLabel} href={ctaHref} variant="primary" />
              </p>
            ) : null}
          </div>
        </div>
      )
    }
    case 'iconRow': {
      const items = (block.items ?? []).filter((it) => typeof it.title === 'string' && it.title.trim())
      if (items.length === 0) {
        return <p className="tma-muted">Add at least one feature with a title in the CMS.</p>
      }
      return (
        <div className="block-icon-row">
          {block.sectionTitle?.trim() ? (
            <h2 className="block-section__title">{block.sectionTitle.trim()}</h2>
          ) : null}
          {block.intro?.trim() ? <p className="block-section__intro">{block.intro.trim()}</p> : null}
          <ul className="block-icon-row__grid">
            {items.map((it, i) => (
              <li key={it.id ?? i} className="block-icon-row__card">
                {it.icon?.trim() ? (
                  <span className="block-icon-row__icon" aria-hidden="true">
                    {it.icon.trim()}
                  </span>
                ) : null}
                <h3 className="block-icon-row__title">{it.title.trim()}</h3>
                {it.body?.trim() ? <p className="block-icon-row__body">{it.body.trim()}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case 'quoteBand': {
      const quote = block.quote?.trim()
      if (!quote) {
        return <p className="tma-muted">Add quote text for this band in the CMS.</p>
      }
      const v =
        block.variant === 'muted' || block.variant === 'border' || block.variant === 'lime'
          ? block.variant
          : 'lime'
      const attr = block.attribution?.trim()
      const roleLine = block.roleLine?.trim()
      return (
        <figure className={`block-quote-band block-quote-band--${v}`}>
          <blockquote className="block-quote-band__quote">
            <p>{quote}</p>
          </blockquote>
          {attr || roleLine ? (
            <figcaption className="block-quote-band__cite">
              {attr ? <span className="block-quote-band__name">{attr}</span> : null}
              {attr && roleLine ? <span className="block-quote-band__sep"> · </span> : null}
              {roleLine ? <span className="block-quote-band__role">{roleLine}</span> : null}
            </figcaption>
          ) : null}
        </figure>
      )
    }
    case 'proofBar': {
      const logos = block.logos?.filter(isPopulatedMedia) ?? []
      if (logos.length === 0) {
        return <p className="tma-muted">Add logos to this proof bar in the CMS.</p>
      }
      const proofCenter = block.logoAlign === 'center'
      return (
        <div className={`block-proof${proofCenter ? ' block-proof--logos-center' : ''}`}>
          <p className="block-proof__label">Trusted by</p>
          <ul className="block-proof__list">
            {logos.map((m) => {
              const src = absoluteMediaUrl(m.url)
              if (!src) return null
              return (
                <li key={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={m.alt || ''} width={120} height={48} loading="lazy" />
                </li>
              )
            })}
          </ul>
        </div>
      )
    }
    case 'testimonialSlider': {
      const items = block.testimonials?.filter(isPopulatedTestimonial) ?? []
      if (items.length === 0) {
        return <p className="tma-muted">Add testimonials in the CMS.</p>
      }
      return (
        <div className="block-testimonials">
          {items.map((t) => (
            <blockquote key={t.id} className="block-testimonials__card">
              <p>{t.quote}</p>
              <footer>
                — {t.author}
                {t.role ? `, ${t.role}` : ''}
                {t.company ? ` · ${t.company}` : ''}
              </footer>
            </blockquote>
          ))}
        </div>
      )
    }
    case 'stats':
      return <AnimatedStats items={block.items ?? []} variant={block.variant} />
    case 'form': {
      if (typeof block.formConfig === 'number') {
        return <p className="tma-muted">Form configuration could not be loaded.</p>
      }
      const fc = block.formConfig as FormConfig
      return (
        <FormBlock
          formConfig={fc}
          pageSlug={page.slug}
          width={block.width ?? 'default'}
        />
      )
    }
    case 'booking': {
      if (typeof block.bookingProfile === 'number') {
        return <p className="tma-muted">Booking profile could not be loaded.</p>
      }
      const bp = block.bookingProfile as BookingProfile
      return <BookingBlock profile={bp} width={block.width ?? 'default'} />
    }
    case 'faq': {
      const items = block.items ?? []
      if (items.length === 0) {
        return <p className="tma-muted">Add FAQ items in the CMS.</p>
      }
      return (
        <div className="block-faq">
          {items.map((item, idx) => (
            <details key={item.id ?? idx} className="block-faq__item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      )
    }
    case 'rich': {
      const c = block.content
      if (
        !c ||
        typeof c !== 'object' ||
        !('root' in c) ||
        c.root == null ||
        typeof c.root !== 'object'
      ) {
        return null
      }
      let data = c as unknown as SerializedEditorState
      if (embedShortcodeVars && Object.keys(embedShortcodeVars).length > 0) {
        data = applyRichTextShortcodes(data, embedShortcodeVars)
      }
      return (
        <div className="block-rich">
          <LexicalRichReadonly data={data} />
        </div>
      )
    }
    case 'teamGrid': {
      const raw = block.members?.filter(isPopulatedTeamMember) ?? []
      const members = [...raw].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )
      if (members.length === 0) {
        return <p className="tma-muted">Add team members in the CMS.</p>
      }
      return (
        <div className="block-team">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
          <ul className="block-team__grid">
            {members.map((m) => {
              const ph = m.photo && isPopulatedMedia(m.photo) ? m.photo : null
              const src = ph ? absoluteMediaUrl(ph.url) : null
              return (
                <li key={m.id} className="block-team__card">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="block-team__photo"
                      src={src}
                      alt={ph?.alt || ''}
                      width={320}
                      height={320}
                      loading="lazy"
                    />
                  ) : (
                    <div className="block-team__photo block-team__photo--placeholder" aria-hidden="true" />
                  )}
                  <h3 className="block-team__name">{m.name}</h3>
                  <p className="block-team__role">{m.role}</p>
                  {m.bio ? <p className="block-team__bio">{m.bio}</p> : null}
                  {m.linkedinUrl ? (
                    <a
                      className="block-team__link"
                      href={m.linkedinUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      )
    }
    case 'caseStudyGrid': {
      const studies = block.studies?.filter(isPopulatedCaseStudy) ?? []
      if (studies.length === 0) {
        return <p className="tma-muted">Add case studies in the CMS.</p>
      }
      return (
        <div className="block-case-studies">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          <ul className="block-case-studies__grid">
            {studies.map((cs) => {
              const img =
                cs.featuredImage && isPopulatedMedia(cs.featuredImage)
                  ? cs.featuredImage
                  : null
              const src = img ? absoluteMediaUrl(img.url) : null
              const ind = cs.industry && isPopulatedIndustry(cs.industry) ? cs.industry : null
              return (
                <li key={cs.id} className="block-case-studies__card">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="block-case-studies__thumb"
                      src={src}
                      alt={img?.alt || ''}
                      width={640}
                      height={360}
                      loading="lazy"
                    />
                  ) : null}
                  {ind ? <p className="block-case-studies__meta">{ind.name}</p> : null}
                  <h3 className="block-case-studies__title">{cs.title}</h3>
                  {cs.summary ? <p className="block-case-studies__summary">{cs.summary}</p> : null}
                </li>
              )
            })}
          </ul>
        </div>
      )
    }
    case 'pricing': {
      const plans = block.plans ?? []
      if (plans.length === 0) {
        return <p className="tma-muted">Add pricing plans in the CMS.</p>
      }
      return (
        <div className="block-pricing">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
          <div className="block-pricing__grid">
            {plans.map((plan, idx) => (
              <article
                key={plan.id ?? idx}
                className={
                  plan.highlighted
                    ? 'block-pricing__plan block-pricing__plan--highlight'
                    : 'block-pricing__plan'
                }
              >
                <h3 className="block-pricing__name">{plan.name}</h3>
                <p className="block-pricing__price">
                  <span>{plan.price}</span>
                  <span className="block-pricing__cadence">
                    {CADENCE_LABEL[plan.cadence ?? 'custom'] ?? ''}
                  </span>
                </p>
                {plan.description ? <p className="block-pricing__desc">{plan.description}</p> : null}
                {plan.bullets && plan.bullets.length > 0 ? (
                  <ul className="block-pricing__bullets">
                    {plan.bullets.map((b) => (
                      <li key={b.id ?? b.text}>{b.text}</li>
                    ))}
                  </ul>
                ) : null}
                {plan.ctaLabel && plan.ctaHref ? (
                  <p className="block-pricing__cta">
                    <CtaButton label={plan.ctaLabel} href={plan.ctaHref} variant="secondary" />
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          {block.footnote ? <p className="block-pricing__footnote">{block.footnote}</p> : null}
        </div>
      )
    }
    case 'comparison': {
      const cols = block.columns ?? []
      const colCount = cols.length
      if (colCount < 2) {
        return <p className="tma-muted">Add at least two column headings for the comparison table.</p>
      }
      const rows = block.rows ?? []
      return (
        <div className="block-comparison">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
          <div className="block-comparison__scroll">
            <table className="block-comparison__table">
              <thead>
                <tr>
                  <th scope="col" className="block-comparison__corner">
                    Feature
                  </th>
                  {cols.map((c, i) => (
                    <th key={c.id ?? i} scope="col">
                      {c.heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.cells ?? []
                  const padded = Array.from({ length: colCount }, (_, i) => {
                    const v = cells[i]?.value
                    return v != null && String(v).trim() !== '' ? String(v) : '—'
                  })
                  return (
                    <tr key={row.id ?? ri}>
                      <th scope="row">{row.label}</th>
                      {padded.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    case 'process': {
      const steps = block.steps ?? []
      if (steps.length === 0) {
        return <p className="tma-muted">Add process steps in the CMS.</p>
      }
      const processDense = block.variant === 'compact'
      return (
        <div className={`block-process${processDense ? ' block-process--compact' : ''}`}>
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
          <ol className="block-process__list">
            {steps.map((step, i) => (
              <li key={step.id ?? i} className="block-process__step">
                {step.badge ? (
                  <span className="block-process__badge">{step.badge}</span>
                ) : (
                  <span className="block-process__badge">{String(i + 1).padStart(2, '0')}</span>
                )}
                <div className="block-process__body">
                  <h3 className="block-process__step-title">{step.title}</h3>
                  {step.body ? <p>{step.body}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )
    }
    case 'textMedia': {
      const rawPos = block.imagePosition
      const pos =
        rawPos === 'left' || rawPos === 'top' || rawPos === 'bottom' ? rawPos : 'right'
      const src = block.imageUrl ? absoluteMediaUrl(block.imageUrl) : null
      const aspectRatio = normalizeAspectRatio(block.aspectRatio)
      const figureStyle: CSSProperties = {
        ...mediaWidthStyle(normalizeMediaWidth(block.mediaWidth)),
        ...mediaAlignStyle(block.mediaAlign),
      }
      const maxWidth = normalizeMediaMaxWidth(block.maxMediaWidth)
      if (maxWidth) figureStyle.maxWidth = maxWidth
      const maxHeight = normalizeMediaMaxWidth(block.maxMediaHeight)
      if (maxHeight) figureStyle.maxHeight = maxHeight
      if (aspectRatio) figureStyle.aspectRatio = aspectRatio
      const radius = normalizeRadius(block.borderRadius)
      if (radius) {
        figureStyle.borderRadius = radius
        figureStyle.overflow = 'hidden'
      }
      const imgStyle: CSSProperties = {
        objectFit: block.mediaFit === 'contain' ? 'contain' : 'cover',
        objectPosition: normalizeObjectPosition(block.mediaPositionX, block.mediaPositionY),
        width: '100%',
        height: aspectRatio || maxHeight ? '100%' : 'auto',
        borderRadius: radius,
      }
      return (
        <div className={`block-text-media block-text-media--${pos}`}>
          <div className="block-text-media__copy">
            {block.headline ? <h2 className="block-text-media__headline">{block.headline}</h2> : null}
            {block.body ? <p className="block-text-media__body">{block.body}</p> : null}
          </div>
          {src ? (
            <div className="block-text-media__figure" style={figureStyle}>
              <ResponsiveImage
                src={src}
                alt={block.imageAlt || ''}
                width={640}
                height={400}
                tabletSrc={block.tabletImageUrl ? (absoluteMediaUrl(block.tabletImageUrl) ?? undefined) : undefined}
                mobileSrc={block.mobileImageUrl ? (absoluteMediaUrl(block.mobileImageUrl) ?? undefined) : undefined}
                imgStyle={imgStyle}
              />
            </div>
          ) : null}
        </div>
      )
    }
    case 'video': {
      const videoSource =
        block.sourceType === 'upload'
          ? block.uploadedVideoUrl?.trim() || block.url?.trim()
          : block.url?.trim()
      if (!videoSource) {
        return <p className="tma-muted">Add a video URL to this block in the CMS.</p>
      }
      const src = toVideoEmbedUrl(videoSource)
      const useIframe = block.sourceType === 'upload' ? false : isLikelyEmbeddableVideoUrl(videoSource)
      const videoWidth = normalizeMediaWidth(block.width)
      const videoStyle: CSSProperties = {
        ...mediaWidthStyle(videoWidth),
        ...mediaAlignStyle(block.mediaAlign),
      }
      const maxWidth = normalizeMediaMaxWidth(block.maxMediaWidth)
      if (maxWidth) videoStyle.maxWidth = maxWidth
      const maxHeight = normalizeMediaMaxWidth(block.maxMediaHeight)
      if (maxHeight) videoStyle.maxHeight = maxHeight
      const aspectRatio = normalizeAspectRatio(block.aspectRatio) ?? '16 / 9'
      const radius = normalizeRadius(block.borderRadius)
      const frameStyle: CSSProperties = { aspectRatio }
      if (radius) frameStyle.borderRadius = radius
      if (maxHeight) frameStyle.maxHeight = maxHeight
      Object.assign(frameStyle, mediaHeightStyle(block.height))
      const nativeStyle: CSSProperties = { width: '100%' }
      if (radius) nativeStyle.borderRadius = radius
      if (maxHeight) nativeStyle.maxHeight = maxHeight
      if (aspectRatio) nativeStyle.aspectRatio = aspectRatio
      return (
        <div
          className={`block-video${videoWidth === 'narrow' ? ' block-video--narrow' : ''}`}
          style={videoStyle}
        >
          {block.title ? <h2 className="block-section__title">{block.title}</h2> : null}
          {useIframe ? (
            <div className="block-video__frame" style={frameStyle}>
              <iframe
                title={block.title || 'Video'}
                src={src}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : (
            <video
              className="block-video__native"
              controls
              preload="metadata"
              poster={block.posterUrl ? (absoluteMediaUrl(block.posterUrl) ?? undefined) : undefined}
              style={nativeStyle}
            >
              <source src={src} />
            </video>
          )}
        </div>
      )
    }
    case 'download': {
      if (!block.fileUrl?.trim()) {
        return <p className="tma-muted">Add a file URL for this download in the CMS.</p>
      }
      return (
        <div className="block-download">
          <h3 className="block-download__title">{block.title}</h3>
          {block.description ? <p className="block-download__desc">{block.description}</p> : null}
          <p className="block-download__action">
            <CtaButton
              label={block.fileLabel?.trim() || 'Download'}
              href={block.fileUrl}
              variant="secondary"
            />
          </p>
        </div>
      )
    }
    case 'spacer': {
      const spacerHeight: Record<string, string> = { xs: '1rem', sm: '2rem', md: '3rem', lg: '5rem', xl: '8rem' }
      const h = spacerHeight[block.height ?? 'md'] ?? spacerHeight.md
      return <div className="block-spacer" style={{ height: h }} aria-hidden="true" />
    }
    case 'layoutBlockRef':
      return (
        <p className="tma-muted">
          Linked saved block is not available (missing row, inactive, or preview without DB). Edit the
          page in the console or republish.
        </p>
      )
    default: {
      const bt = (block as { blockType?: string }).blockType
      return (
        <p className="tma-muted">
          Unknown block type: <code>{bt ?? '?'}</code>. Remove it or upgrade the renderer.
        </p>
      )
    }
  }
}

type PageLayoutProps = {
  page: Page
  /**
   * When set, only these blocks are rendered (e.g. a slice around the page hero).
   * Sticky CTA is not read from this slice — use the full `page.layout` path for that.
   */
  blocks?: NonNullable<Page['layout']>
  /** Allowlisted `{{site_name}}` etc. in rich text blocks. */
  embedShortcodeVars?: Record<string, string>
}

export function PageLayout({ page, blocks: blockSlice, embedShortcodeVars }: PageLayoutProps) {
  const fullLayout = page.layout
  const layout = blockSlice ?? fullLayout
  if (!layout?.length) return null

  const mainBlocks = layout.filter((b) => b.blockType !== 'stickyCta')
  if (mainBlocks.length === 0) return null

  const useFullLayoutForSticky = blockSlice === undefined
  const stickyFromFull = useFullLayoutForSticky
    ? (fullLayout ?? []).filter(
        (b): b is Extract<LayoutBlock, { blockType: 'stickyCta' }> => b.blockType === 'stickyCta',
      )
    : []
  const lastSticky = stickyFromFull[stickyFromFull.length - 1]

  return (
    <>
      <section className="blocks" aria-label="Page sections">
        {mainBlocks.map((block, i) => {
          const key = block.id ?? `b-${i}`
          if (block.blockType === 'hero') {
            return (
              <SectionOuter key={key} page={page} block={block}>
                {renderBlock(block, page, embedShortcodeVars)}
              </SectionOuter>
            )
          }
          const blur =
            block.blockType === 'testimonialSlider' || block.blockType === 'imageBanner'
          return (
            <SectionOuter key={key} page={page} block={block}>
              <Reveal className="block-shell" variant={blur ? 'blur' : 'fade'}>
                {renderBlock(block, page, embedShortcodeVars)}
              </Reveal>
            </SectionOuter>
          )
        })}
      </section>
      {lastSticky ? (
        <StickyCtaBar
          label={lastSticky.label}
          href={lastSticky.href}
          variant={lastSticky.variant ?? 'primary'}
        />
      ) : null}
    </>
  )
}
