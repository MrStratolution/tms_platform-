import Link from 'next/link'
import type { SerializedEditorState } from 'lexical'
import type { CSSProperties, ReactNode } from 'react'

import { LexicalRichReadonly } from '@/components/cms/LexicalRichReadonly'
import { MotionHeading } from '@/components/motion/MotionHeading'
import { NoiseOverlay } from '@/components/motion/NoiseOverlay'
import { applyRichTextShortcodes } from '@/lib/cms/richTextShortcodes'
import {
  resolveSectionSpacingStyle,
  resolveSectionWidthClass,
  sectionEffectsFromBlock,
  sectionChromeFromBlock,
} from '@/lib/cms/resolveSectionPresentation'
import { Reveal } from '@/components/motion/Reveal'
import { SectionGlow } from '@/components/motion/SectionGlow'
import { AnimatedStats } from '@/components/tma/AnimatedStats'
import { CtaButton } from '@/components/tma/CtaButton'
import { HeroBackdrop } from '@/components/tma/HeroBackdrop'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { normalizeProductContentKind } from '@/lib/productFeeds'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'
import type {
  BookingProfile,
  CaseStudy,
  FormConfig,
  Industry,
  Media,
  Page,
  Product,
  TeamMember,
  Testimonial,
} from '@/types/cms'

import { toVideoEmbedUrl, isLikelyEmbeddableVideoUrl } from '@/lib/videoEmbed'

import { BookingBlock } from './BookingBlock'
import { CardRail } from './CardRail'
import { FormBlock } from './FormBlock'
import { IndustryGridBlock } from './IndustryGridBlock'
import { ServicesFocusBlock } from './ServicesFocusBlock'
import { StickyCtaBar } from './StickyCtaBar'
import { TestimonialCard } from './TestimonialCard'

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

function isPopulatedPage(p: number | Page): p is Page {
  return typeof p === 'object' && p != null && 'slug' in p && 'title' in p
}

function isPopulatedProduct(p: number | Product): p is Product {
  return typeof p === 'object' && p != null && 'slug' in p && 'name' in p
}

const CADENCE_LABEL: Record<string, string> = {
  monthly: '/mo',
  annual: '/yr',
  once: ' one-time',
  custom: '',
}

function getPrimaryHeroBlock(page: Page) {
  if (!Array.isArray(page.layout)) return null
  const hero = page.layout.find(
    (block): block is Extract<NonNullable<Page['layout']>[number], { blockType: 'hero' }> =>
      !!block && typeof block === 'object' && 'blockType' in block && block.blockType === 'hero',
  )
  return hero ?? null
}

function displayPageTitle(page: Page): string {
  const hero = getPrimaryHeroBlock(page)
  const headline = hero?.headline?.trim()
  if (headline) return headline
  const legacy = page.hero?.headline?.trim()
  if (legacy) return legacy
  return page.title.replace(/\s*[·|-]\s*The Modesty Argument\s*$/i, '').trim()
}

function pageExcerpt(page: Page): string {
  const hero = getPrimaryHeroBlock(page)
  const heroSubheadline = hero?.subheadline?.trim()
  if (heroSubheadline) return heroSubheadline
  const legacy = page.hero?.subheadline?.trim()
  if (legacy) return legacy
  const seoDescription = page.seo?.description?.trim()
  if (seoDescription) return seoDescription
  return ''
}

function pageImage(page: Page): { src: string; alt: string } | null {
  const hero = getPrimaryHeroBlock(page)
  const heroMediaUrl =
    typeof hero?.backgroundMediaUrl === 'string' && hero.backgroundMediaUrl.trim()
      ? absoluteMediaUrl(hero.backgroundMediaUrl.trim())
      : null
  if (heroMediaUrl) {
    return {
      src: heroMediaUrl,
      alt: displayPageTitle(page),
    }
  }
  if (hero?.backgroundMedia && isPopulatedMedia(hero.backgroundMedia)) {
    const mediaUrl = typeof hero.backgroundMedia.url === 'string' ? hero.backgroundMedia.url : ''
    if (!mediaUrl) return null
    return {
      src: absoluteMediaUrl(mediaUrl) ?? mediaUrl,
      alt: hero.backgroundMedia.alt || displayPageTitle(page),
    }
  }
  if (page.hero?.backgroundMedia && isPopulatedMedia(page.hero.backgroundMedia)) {
    const mediaUrl = typeof page.hero.backgroundMedia.url === 'string' ? page.hero.backgroundMedia.url : ''
    if (!mediaUrl) return null
    return {
      src: absoluteMediaUrl(mediaUrl) ?? mediaUrl,
      alt: page.hero.backgroundMedia.alt || displayPageTitle(page),
    }
  }
  return null
}

function caseStudyTitle(caseStudy: CaseStudy | null): string {
  return caseStudy?.title?.trim() || ''
}

function caseStudySummary(caseStudy: CaseStudy | null): string {
  return caseStudy?.summary?.trim() || ''
}

function caseStudyImage(caseStudy: CaseStudy | null): { src: string; alt: string } | null {
  const image =
    caseStudy?.featuredImage && isPopulatedMedia(caseStudy.featuredImage) ? caseStudy.featuredImage : null
  const src = image ? absoluteMediaUrl(image.url) : null
  if (!src) return null
  return {
    src,
    alt: image?.alt || caseStudyTitle(caseStudy),
  }
}

function caseStudyIndustryLabel(caseStudy: CaseStudy | null): string {
  const industry =
    caseStudy?.industry && isPopulatedIndustry(caseStudy.industry) ? caseStudy.industry : null
  return industry?.name?.trim() || ''
}

function caseStudyHref(caseStudy: CaseStudy | null, locale: PublicLocale): string | null {
  const slug = caseStudy?.slug?.trim()
  if (!slug) return null
  return localizePublicHref(`/work/${slug}`, locale)
}

function formatPageDate(page: Page, locale: PublicLocale): string {
  const date = page.createdAt || page.updatedAt
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  } catch {
    return ''
  }
}

function localizedProductDocument(product: Product) {
  return product.document && typeof product.document === 'object' && !Array.isArray(product.document)
    ? (product.document as Record<string, unknown>)
    : {}
}

function productDisplayName(product: Product): string {
  return product.name.trim() || product.slug
}

function productSummary(product: Product): string {
  const doc = localizedProductDocument(product)
  const summary = typeof doc.summary === 'string' ? doc.summary.trim() : ''
  if (summary) return summary
  const tagline = typeof doc.tagline === 'string' ? doc.tagline.trim() : ''
  if (tagline) return tagline
  const seo = doc.seo
  if (seo && typeof seo === 'object' && !Array.isArray(seo) && typeof (seo as { description?: unknown }).description === 'string') {
    return ((seo as { description: string }).description || '').trim()
  }
  return ''
}

function productTypeLabel(product: Product): string {
  const doc = localizedProductDocument(product)
  if (typeof doc.projectType === 'string' && doc.projectType.trim()) return doc.projectType.trim()
  if (typeof doc.typeLabel === 'string' && doc.typeLabel.trim()) return doc.typeLabel.trim()
  const contentKind = normalizeProductContentKind(product.contentKind)
  if (contentKind !== 'product') {
    return contentKind.charAt(0).toUpperCase() + contentKind.slice(1)
  }
  return ''
}

function productImage(product: Product): { src: string; alt: string } | null {
  const doc = localizedProductDocument(product)
  const raw = typeof doc.coverImageUrl === 'string' ? doc.coverImageUrl.trim() : ''
  if (!raw) return null
  return {
    src: absoluteMediaUrl(raw) ?? raw,
    alt:
      (typeof doc.coverImageAlt === 'string' && doc.coverImageAlt.trim()) ||
      productDisplayName(product),
  }
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

function SectionOuter(props: {
  page: Page
  block: LayoutBlock
  children: ReactNode
  selectedBlockId?: string | null
  isBuilderPreview?: boolean
  onSelectBlock?: (blockId: string) => void
}) {
  const { page, block, children } = props
  const chrome = sectionChromeFromBlock(block)
  if (chrome.sectionHidden) return null
  const baseStyle = resolveSectionSpacingStyle(page, chrome)
  const widthClass = resolveSectionWidthClass(page, chrome)
  const anchor =
    chrome.anchorId?.trim().replace(/^#/, '') ||
    (typeof block.id === 'string' && block.id.trim() ? block.id.trim() : '')
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
  const isSelected =
    typeof block.id === 'string' && props.selectedBlockId === block.id
  const cls = `tma-block-outer${isSelected ? ' tma-block-outer--selected' : ''} ${widthClass}${extra ? ` ${extra}` : ''}${responsiveHide ? ` ${responsiveHide}` : ''}${themeClass ? ` ${themeClass}` : ''}`.trim()
  return (
    <div
      id={anchor || undefined}
      data-tma-block-id={typeof block.id === 'string' ? block.id : undefined}
      data-tma-block-selected={isSelected ? 'true' : 'false'}
      className={cls}
      style={blockStyle}
      onClickCapture={(event) => {
        if (!props.isBuilderPreview) return
        if (typeof block.id !== 'string' || !block.id.trim()) return
        event.preventDefault()
        event.stopPropagation()
        props.onSelectBlock?.(block.id)
      }}
    >
      {children}
    </div>
  )
}

function renderBlock(
  block: LayoutBlock,
  page: Page,
  locale: PublicLocale,
  embedShortcodeVars?: Record<string, string>,
  heroEffect: 'none' | 'rotating-text' | 'canvas-accent' = 'none',
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
          secondaryCtaLabel={block.secondaryCtaLabel}
          secondaryCtaHref={block.secondaryCtaHref}
          headingId={block.id ? `tma-hero-${block.id}` : 'tma-block-hero-heading'}
          tabletImageUrl={block.tabletImageUrl}
          mobileImageUrl={block.mobileImageUrl}
          height={block.height}
          mediaFit={block.mediaFit}
          mediaPositionX={block.mediaPositionX}
          mediaPositionY={block.mediaPositionY}
          heroEffect={heroEffect}
          locale={locale}
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
            locale={locale}
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
          <SectionGlow className="block-promo-banner__glow" tone="soft" />
          <NoiseOverlay className="block-promo-banner__noise" strength="soft" />
          <div className="block-promo-banner__inner">
            {eyebrow ? <p className="block-promo-banner__eyebrow">{eyebrow}</p> : null}
            <MotionHeading
              as="h2"
              className="block-promo-banner__headline"
              id={headingId}
              text={headline}
              intervalMs={2400}
              enabled={heroEffect === 'rotating-text'}
            />
            {body ? <p className="block-promo-banner__body">{body}</p> : null}
            {ctaLabel && ctaHref ? (
              <p className="block-promo-banner__cta">
                <CtaButton label={ctaLabel} href={ctaHref} variant="primary" locale={locale} />
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
          <div className="block-image-banner__media tma-media-hover">
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
          <SectionGlow className="block-image-banner__glow" tone="lime" />
          <NoiseOverlay className="block-image-banner__noise" strength="soft" />
          <div className="block-image-banner__inner">
            {headline ? (
              <MotionHeading
                as="h2"
                className="block-image-banner__headline"
                id={headingId}
                text={headline}
                intervalMs={2500}
                enabled={heroEffect === 'rotating-text'}
              />
            ) : null}
            {sub ? <p className="block-image-banner__sub">{sub}</p> : null}
            {ctaLabel && ctaHref ? (
              <p className="block-image-banner__cta">
                <CtaButton label={ctaLabel} href={ctaHref} variant="primary" locale={locale} />
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
              <li key={it.id ?? i} className="block-icon-row__card tma-surface-lift">
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
      const v =
        block.variant === 'muted' || block.variant === 'border' || block.variant === 'lime'
          ? block.variant
          : 'lime'
      const displayMode = block.displayMode === 'statementMarquee' ? 'statementMarquee' : 'quote'
      if (displayMode === 'statementMarquee') {
        const statement = block.statementText?.trim() || block.quote?.trim()
        if (!statement) {
          return <p className="tma-muted">Add statement text for this band in the CMS.</p>
        }
        const duration =
          block.marqueeSpeedPreset === 'slow'
            ? '32s'
            : block.marqueeSpeedPreset === 'fast'
              ? '18s'
              : '24s'
        const segments = Array.from({ length: 6 }, () => statement)
        return (
          <div
            className={`block-quote-band block-quote-band--${v} block-quote-band--marquee${block.pauseOnHover !== false ? ' block-quote-band--pause-on-hover' : ''}`}
            style={{ ['--quote-band-duration' as string]: duration }}
          >
            <div className="block-quote-band__marquee" aria-label={statement}>
              <div className="block-quote-band__track">
                {segments.map((segment, idx) => (
                  <span key={`a-${idx}`} className="block-quote-band__segment">
                    {segment}
                  </span>
                ))}
              </div>
              <div className="block-quote-band__track" aria-hidden="true">
                {segments.map((segment, idx) => (
                  <span key={`b-${idx}`} className="block-quote-band__segment">
                    {segment}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      }
      const quote = block.quote?.trim()
      if (!quote) {
        return <p className="tma-muted">Add quote text for this band in the CMS.</p>
      }
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
      const layoutPreset = block.layoutPreset === 'grid' ? 'grid' : 'spotlight'
      const showPortraits = block.showPortraits !== false
      const showLogos = block.showLogos !== false
      const testimonialCards = items.map((t) => {
        const photo = showPortraits && t.photo && isPopulatedMedia(t.photo) ? t.photo : null
        const photoSrc = photo ? absoluteMediaUrl(photo.url) : null
        const logo = t.logo && isPopulatedMedia(t.logo) ? t.logo : null
        const logoSrc = logo ? absoluteMediaUrl(logo.url) : null
        return (
          <li key={t.id} className="block-testimonials__entry tma-surface-lift">
            {(photoSrc || (showLogos && (logoSrc || t.company?.trim()))) ? (
              <div className="block-testimonials__entry-meta">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="block-testimonials__entry-photo"
                    src={photoSrc}
                    alt={photo?.alt || t.author}
                    width={96}
                    height={96}
                    loading="lazy"
                  />
                ) : null}
                {showLogos && (logoSrc || t.company?.trim()) ? (
                  logoSrc ? (
                    <div className="block-testimonials__logo-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="block-testimonials__logo"
                        src={logoSrc}
                        alt={logo?.alt || t.company?.trim() || t.author}
                        width={120}
                        height={48}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <p className="block-testimonials__badge">
                      {(t.company ?? t.author).trim()}
                    </p>
                  )
                ) : null}
              </div>
            ) : null}
            <TestimonialCard quote={t.quote} locale={locale} />
            <footer className="block-testimonials__entry-footer">
              <strong>{t.author}</strong>
              {t.role ? <span>{t.role}</span> : null}
              {t.company ? <span>{t.company}</span> : null}
            </footer>
          </li>
        )
      })
      return (
        <div className={`block-testimonials block-testimonials--${layoutPreset}`}>
          {block.sectionIntro?.trim() ? (
            <p className="block-section__intro">{block.sectionIntro.trim()}</p>
          ) : null}
          {layoutPreset === 'spotlight' ? (
            <CardRail
              itemCount={items.length}
              variant="content"
              listClassName="block-testimonials__list"
              ariaLabel="Testimonials"
              forceRail
            >
              {testimonialCards}
            </CardRail>
          ) : (
            <ul className="block-testimonials__grid" aria-label="Testimonials">
              {testimonialCards}
            </ul>
          )}
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
          locale={locale}
        />
      )
    }
    case 'booking': {
      if (typeof block.bookingProfile === 'number') {
        return <p className="tma-muted">Booking profile could not be loaded.</p>
      }
      const bp = block.bookingProfile as BookingProfile
      return <BookingBlock profile={bp} width={block.width ?? 'default'} locale={locale} />
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
          <CardRail
            itemCount={members.length}
            variant="team"
            listClassName="block-team__grid"
            ariaLabel={block.sectionTitle?.trim() || 'Team members'}
          >
            {members.map((m) => {
              const ph = m.photo && isPopulatedMedia(m.photo) ? m.photo : null
              const src = ph ? absoluteMediaUrl(ph.url) : null
              return (
                <li key={m.id} className="block-team__card tma-surface-lift">
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
          </CardRail>
        </div>
      )
    }
    case 'caseStudyGrid': {
      const studies = block.studies?.filter(isPopulatedCaseStudy) ?? []
      if (studies.length === 0) {
        return <p className="tma-muted">Add case studies in the CMS.</p>
      }
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()
      return (
        <div className="block-case-studies">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
          <CardRail
            itemCount={studies.length}
            variant="content"
            listClassName="block-case-studies__grid"
            ariaLabel={block.sectionTitle?.trim() || 'Case studies'}
          >
            {studies.map((cs) => {
              const img =
                cs.featuredImage && isPopulatedMedia(cs.featuredImage)
                  ? cs.featuredImage
                  : null
              const src = img ? absoluteMediaUrl(img.url) : null
              const ind = cs.industry && isPopulatedIndustry(cs.industry) ? cs.industry : null
              const detailHref = localizePublicHref(`/work/${cs.slug}`, locale)
              return (
                <li key={cs.id} className="block-case-studies__card tma-surface-lift">
                  <Link href={detailHref} className="block-case-studies__link">
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
                  </Link>
                </li>
              )
            })}
          </CardRail>
          {ctaLabel && ctaHref ? (
            <p className="block-case-studies__cta">
              <CtaButton label={ctaLabel} href={ctaHref} variant="ghost" locale={locale} />
            </p>
          ) : null}
        </div>
      )
    }
    case 'featuredProjectSpotlight': {
      const linkedCaseStudy =
        block.caseStudyId && isPopulatedCaseStudy(block.caseStudyId) ? block.caseStudyId : null
      const linkedHref = caseStudyHref(linkedCaseStudy, locale)
      const linkedImage = caseStudyImage(linkedCaseStudy)
      const linkedIndustry = caseStudyIndustryLabel(linkedCaseStudy)
      const title = caseStudyTitle(linkedCaseStudy) || block.title?.trim() || ''
      const description = caseStudySummary(linkedCaseStudy) || block.description?.trim() || ''
      const imageSrc = linkedImage?.src || (typeof block.imageUrl === 'string' ? absoluteMediaUrl(block.imageUrl) ?? block.imageUrl : null)
      const imageAlt = linkedImage?.alt || block.imageAlt?.trim() || title || 'Featured project visual'
      const ctaHref = block.ctaHref?.trim() || linkedHref || ''
      const ctaLabel =
        block.ctaLabel?.trim() ||
        (linkedHref ? (locale === 'de' ? 'Projekt ansehen' : 'View project') : '')
      const secondaryCtaHref =
        block.secondaryCtaHref?.trim() || (linkedHref ? localizePublicHref('/contact', locale) : '')
      const secondaryCtaLabel =
        block.secondaryCtaLabel?.trim() ||
        (secondaryCtaHref ? (locale === 'de' ? 'Projekt besprechen' : 'Discuss the project') : '')
      const stats = Array.isArray(block.stats)
        ? block.stats.filter((row) => typeof row?.value === 'string' && typeof row?.label === 'string' && row.value.trim() && row.label.trim())
        : []
      const quote = block.quote?.trim()
      const quoteAttribution = block.quoteAttribution?.trim()
      const layoutPreset = block.layoutPreset === 'immersive' ? 'immersive' : 'split'
      const mediaMode = block.mediaMode === 'videoPoster' ? 'videoPoster' : 'image'
      const missingContent = !title && !description && !imageSrc
      const mediaHrefRaw = ctaHref || linkedHref || ''
      const mediaHref = mediaHrefRaw ? localizePublicHref(mediaHrefRaw, locale) : ''

      if (missingContent) {
        return <p className="tma-muted">Link a case study or add manual project content in the CMS.</p>
      }

      return (
        <div className={`block-featured-project block-featured-project--${layoutPreset}`}>
          <article className="block-featured-project__surface tma-surface-lift">
            <div className="block-featured-project__copy">
              {block.eyebrow?.trim() ? <p className="block-featured-project__eyebrow">{block.eyebrow.trim()}</p> : null}
              {linkedIndustry ? <p className="block-featured-project__meta">{linkedIndustry}</p> : null}
              {title ? <h2 className="block-featured-project__title">{title}</h2> : null}
              {description ? <p className="block-featured-project__description">{description}</p> : null}
              {stats.length > 0 ? (
                <ul className="block-featured-project__stats">
                  {stats.map((stat) => (
                    <li key={stat.id ?? `${stat.value}-${stat.label}`} className="block-featured-project__stat">
                      <strong>
                        {stat.value}
                        {stat.suffix ?? ''}
                      </strong>
                      <span>{stat.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {quote ? (
                <blockquote className="block-featured-project__quote">
                  <p>{quote}</p>
                  {quoteAttribution ? <footer>{quoteAttribution}</footer> : null}
                </blockquote>
              ) : null}
              {((ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref)) ? (
                <div className="block-featured-project__actions">
                  {ctaLabel && ctaHref ? (
                    <CtaButton label={ctaLabel} href={ctaHref} variant="primary" locale={locale} />
                  ) : null}
                  {secondaryCtaLabel && secondaryCtaHref ? (
                    <CtaButton label={secondaryCtaLabel} href={secondaryCtaHref} variant="ghost" locale={locale} />
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={`block-featured-project__media block-featured-project__media--${mediaMode}`}>
              {imageSrc ? (
                mediaHref ? (
                  <Link href={mediaHref} className="block-featured-project__media-link">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="block-featured-project__image"
                      src={imageSrc}
                      alt={imageAlt}
                      width={1280}
                      height={900}
                      loading="lazy"
                    />
                    {mediaMode === 'videoPoster' ? (
                      <span className="block-featured-project__play" aria-hidden="true">
                        ▶
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="block-featured-project__image"
                      src={imageSrc}
                      alt={imageAlt}
                      width={1280}
                      height={900}
                      loading="lazy"
                    />
                    {mediaMode === 'videoPoster' ? (
                      <span className="block-featured-project__play" aria-hidden="true">
                        ▶
                      </span>
                    ) : null}
                  </>
                )
              ) : (
                <div className="block-featured-project__placeholder" aria-hidden="true" />
              )}
            </div>
          </article>
        </div>
      )
    }
    case 'resourceFeed': {
      const populatedPages = (block.pages?.filter(isPopulatedPage) ?? [])
        .filter((page, index, arr) => arr.findIndex((item) => item.id === page.id) === index)
      const featuredCandidate =
        block.featuredPage && isPopulatedPage(block.featuredPage) ? block.featuredPage : null
      const featured = featuredCandidate ?? populatedPages[0] ?? null
      const resourcePages = populatedPages.filter((page) => (featured ? page.id !== featured.id : true))
      const limit =
        typeof block.limit === 'number' && Number.isFinite(block.limit) && block.limit > 0
          ? Math.max(1, Math.floor(block.limit))
          : resourcePages.length
      const cards = resourcePages.slice(0, limit)
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()

      if (!featured && cards.length === 0) {
        return <p className="tma-muted">Add published resource pages to populate this news feed.</p>
      }

      return (
        <div className="block-resource-feed">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}

          {featured ? (
            <article className="block-resource-feed__featured tma-surface-lift">
              <Link
                href={localizePublicHref(`/${featured.slug}`, locale)}
                className="block-resource-feed__featured-link"
              >
                {pageImage(featured) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="block-resource-feed__featured-image"
                    src={pageImage(featured)!.src}
                    alt={pageImage(featured)!.alt}
                    width={1200}
                    height={720}
                    loading="lazy"
                  />
                ) : null}
                <div className="block-resource-feed__featured-copy">
                  <p className="block-resource-feed__meta">
                    Featured article
                    {formatPageDate(featured, locale) ? ` · ${formatPageDate(featured, locale)}` : ''}
                  </p>
                  <h3 className="block-resource-feed__featured-title">{displayPageTitle(featured)}</h3>
                  {pageExcerpt(featured) ? (
                    <p className="block-resource-feed__featured-excerpt">{pageExcerpt(featured)}</p>
                  ) : null}
                </div>
              </Link>
            </article>
          ) : null}

          {cards.length > 0 ? (
            <CardRail
              itemCount={cards.length}
              variant="content"
              listClassName="block-resource-feed__grid"
              ariaLabel={block.sectionTitle?.trim() || 'News articles'}
            >
              {cards.map((entry) => {
                const image = pageImage(entry)
                const href = localizePublicHref(`/${entry.slug}`, locale)
                return (
                  <li key={entry.id} className="block-resource-feed__card tma-surface-lift">
                    <Link href={href} className="block-resource-feed__card-link">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="block-resource-feed__card-image"
                          src={image.src}
                          alt={image.alt}
                          width={800}
                          height={480}
                          loading="lazy"
                        />
                      ) : null}
                      {formatPageDate(entry, locale) ? (
                        <p className="block-resource-feed__meta">{formatPageDate(entry, locale)}</p>
                      ) : null}
                      <h3 className="block-resource-feed__card-title">{displayPageTitle(entry)}</h3>
                      {pageExcerpt(entry) ? (
                        <p className="block-resource-feed__card-excerpt">{pageExcerpt(entry)}</p>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </CardRail>
          ) : null}

          {ctaLabel && ctaHref ? (
            <p className="block-resource-feed__cta">
              <CtaButton label={ctaLabel} href={ctaHref} variant="ghost" locale={locale} />
            </p>
          ) : null}
        </div>
      )
    }
    case 'productFeed': {
      const populatedProducts = (block.products?.filter(isPopulatedProduct) ?? [])
        .filter((product, index, arr) => arr.findIndex((item) => item.id === product.id) === index)
      const featuredCandidate =
        block.featuredProduct && isPopulatedProduct(block.featuredProduct)
          ? block.featuredProduct
          : null
      const featured = featuredCandidate ?? populatedProducts[0] ?? null
      const products = populatedProducts.filter((product) => (featured ? product.id !== featured.id : true))
      const limit =
        typeof block.limit === 'number' && Number.isFinite(block.limit) && block.limit > 0
          ? Math.max(1, Math.floor(block.limit))
          : products.length
      const cards = products.slice(0, limit)
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()

      if (!featured && cards.length === 0) {
        return <p className="tma-muted">Add published products to populate this projects grid.</p>
      }

      return (
        <div className="block-product-feed">
          {block.sectionTitle ? (
            <h2 className="block-section__title">{block.sectionTitle}</h2>
          ) : null}
          {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}

          {featured ? (
            <article className="block-product-feed__featured tma-surface-lift">
              <Link
                href={localizePublicHref(`/products/${featured.slug}`, locale)}
                className="block-product-feed__featured-link"
              >
                {productImage(featured) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="block-product-feed__featured-image"
                    src={productImage(featured)!.src}
                    alt={productImage(featured)!.alt}
                    width={1200}
                    height={720}
                    loading="lazy"
                  />
                ) : null}
                <div className="block-product-feed__featured-copy">
                  {productTypeLabel(featured) ? (
                    <p className="block-product-feed__meta">{productTypeLabel(featured)}</p>
                  ) : null}
                  <h3 className="block-product-feed__featured-title">{productDisplayName(featured)}</h3>
                  {productSummary(featured) ? (
                    <p className="block-product-feed__featured-excerpt">{productSummary(featured)}</p>
                  ) : null}
                </div>
              </Link>
            </article>
          ) : null}

          {cards.length > 0 ? (
            <CardRail
              itemCount={cards.length}
              variant="content"
              listClassName="block-product-feed__grid"
              ariaLabel={block.sectionTitle?.trim() || 'Projects'}
            >
              {cards.map((product) => {
                const image = productImage(product)
                return (
                  <li key={product.id} className="block-product-feed__card tma-surface-lift">
                    <Link
                      href={localizePublicHref(`/products/${product.slug}`, locale)}
                      className="block-product-feed__card-link"
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="block-product-feed__card-image"
                          src={image.src}
                          alt={image.alt}
                          width={800}
                          height={480}
                          loading="lazy"
                        />
                      ) : null}
                      {productTypeLabel(product) ? (
                        <p className="block-product-feed__meta">{productTypeLabel(product)}</p>
                      ) : null}
                      <h3 className="block-product-feed__card-title">{productDisplayName(product)}</h3>
                      {productSummary(product) ? (
                        <p className="block-product-feed__card-excerpt">{productSummary(product)}</p>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </CardRail>
          ) : null}

          {ctaLabel && ctaHref ? (
            <p className="block-product-feed__cta">
              <CtaButton label={ctaLabel} href={ctaHref} variant="ghost" locale={locale} />
            </p>
          ) : null}
        </div>
      )
    }
    case 'servicesFocus':
      return (
        <ServicesFocusBlock
          sectionTitle={block.sectionTitle}
          intro={block.intro}
          items={block.items ?? []}
          ctaLabel={block.ctaLabel}
          ctaHref={block.ctaHref}
          locale={locale}
        />
      )
    case 'industryGrid':
      return (
        <IndustryGridBlock
          sectionTitle={block.sectionTitle}
          intro={block.intro}
          industries={block.industries ?? []}
          ctaLabel={block.ctaLabel}
          ctaHref={block.ctaHref}
          locale={locale}
        />
      )
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
                    ? 'block-pricing__plan block-pricing__plan--highlight tma-surface-lift'
                    : 'block-pricing__plan tma-surface-lift'
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
                    <CtaButton label={plan.ctaLabel} href={plan.ctaHref} variant="secondary" locale={locale} />
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
      const layoutPreset =
        block.layoutPreset === 'timeline' || block.layoutPreset === 'milestones'
          ? block.layoutPreset
          : 'process'
      const processDense = block.variant === 'compact'
      if (layoutPreset === 'milestones') {
        return (
          <div className="block-process block-process--milestones">
            {block.sectionTitle ? (
              <h2 className="block-section__title">{block.sectionTitle}</h2>
            ) : null}
            {block.intro ? <p className="block-section__intro">{block.intro}</p> : null}
            <ol className="block-process__milestones">
              {steps.map((step, i) => (
                <li key={step.id ?? i} className="block-process__milestone tma-surface-lift">
                  <span className="block-process__badge">
                    {step.badge || String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="block-process__step-title">{step.title}</h3>
                  {step.body ? <p>{step.body}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        )
      }
      return (
        <div
          className={`block-process${processDense ? ' block-process--compact' : ''}${layoutPreset === 'timeline' ? ' block-process--timeline' : ''}`}
        >
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
            <div className="block-text-media__figure tma-media-hover" style={figureStyle}>
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
      const useIframe =
        block.sourceType === 'upload' || !videoSource ? false : isLikelyEmbeddableVideoUrl(videoSource)
      const autoplay = block.autoplay === true
      const muted = autoplay ? true : block.muted !== false
      const loop = block.loop === true
      const controls = block.controls !== false
      const src = videoSource
        ? useIframe
          ? toVideoEmbedUrl(videoSource, { autoplay, muted, loop, controls })
          : absoluteMediaUrl(videoSource) ?? videoSource
        : ''
      const videoWidth = normalizeMediaWidth(block.width)
      const layoutPreset = block.layoutPreset === 'split' ? 'split' : 'stacked'
      const headlineCenter = block.headlineAlign === 'center'
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
      const poster = block.posterUrl ? (absoluteMediaUrl(block.posterUrl) ?? undefined) : undefined
      const eyebrow = block.eyebrow?.trim()
      const title = block.title?.trim()
      const description = block.description?.trim()
      const caption = block.caption?.trim()
      const ctaLabel = block.ctaLabel?.trim()
      const ctaHref = block.ctaHref?.trim()
      if (!videoSource) {
        return (
          <div className={`block-video block-video--${layoutPreset} block-video--empty`} style={videoStyle}>
            <div className={`block-video__copy${headlineCenter ? ' block-video__copy--center' : ''}`}>
              {eyebrow ? <p className="block-video__eyebrow">{eyebrow}</p> : null}
              {title ? <h2 className="block-section__title">{title}</h2> : null}
              {description ? <p className="block-section__intro">{description}</p> : null}
              <p className="tma-muted">Add a video URL or upload in the CMS to populate this showcase.</p>
            </div>
          </div>
        )
      }
      return (
        <div
          className={`block-video block-video--${layoutPreset}${videoWidth === 'narrow' ? ' block-video--narrow' : ''}`}
          style={videoStyle}
        >
          <div className={`block-video__copy${headlineCenter ? ' block-video__copy--center' : ''}`}>
            {eyebrow ? <p className="block-video__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="block-section__title">{title}</h2> : null}
            {description ? <p className="block-section__intro">{description}</p> : null}
            {ctaLabel && ctaHref ? (
              <p className="block-video__cta">
                <CtaButton label={ctaLabel} href={ctaHref} variant="secondary" locale={locale} />
              </p>
            ) : null}
          </div>
          <div className="block-video__media">
            {useIframe ? (
              <div className="block-video__frame" style={frameStyle}>
                <iframe
                  title={title || eyebrow || 'Video showcase'}
                  src={src}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              <video
                className="block-video__native"
                controls={controls}
                muted={muted}
                autoPlay={autoplay}
                loop={loop}
                playsInline
                preload="metadata"
                poster={poster}
                style={nativeStyle}
              >
                <source src={src} />
              </video>
            )}
            {caption ? <p className="block-video__caption">{caption}</p> : null}
          </div>
        </div>
      )
    }
    case 'mediaGallery': {
      const items =
        block.items?.filter((item) => typeof item.imageUrl === 'string' && item.imageUrl.trim()) ?? []
      if (items.length === 0) {
        return <p className="tma-muted">Add gallery images in the CMS.</p>
      }
      const layoutPreset =
        block.layoutPreset === 'grid' || block.layoutPreset === 'mosaic' ? block.layoutPreset : 'editorial'
      return (
        <div className={`block-media-gallery block-media-gallery--${layoutPreset}`}>
          {block.eyebrow?.trim() ? <p className="block-media-gallery__eyebrow">{block.eyebrow.trim()}</p> : null}
          {block.title?.trim() ? <h2 className="block-section__title">{block.title.trim()}</h2> : null}
          {block.description?.trim() ? <p className="block-section__intro">{block.description.trim()}</p> : null}
          <div className="block-media-gallery__grid">
            {items.map((item, idx) => {
              const src = absoluteMediaUrl(item.imageUrl!.trim()) ?? item.imageUrl!.trim()
              const aspectRatio = normalizeAspectRatio(item.aspectRatio) ?? '4 / 5'
              const href = item.linkHref?.trim()
              if (!href) {
                return (
                  <figure
                    key={item.id ?? idx}
                    className="block-media-gallery__item tma-surface-lift"
                    style={{ ['--gallery-aspect-ratio' as string]: aspectRatio } as CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="block-media-gallery__image"
                      src={src}
                      alt={item.imageAlt?.trim() || item.caption?.trim() || 'Gallery image'}
                      width={960}
                      height={1200}
                      loading="lazy"
                    />
                    {item.caption?.trim() ? <figcaption className="block-media-gallery__caption">{item.caption.trim()}</figcaption> : null}
                  </figure>
                )
              }
              const localizedHref = /^https?:\/\//i.test(href) ? href : localizePublicHref(href, locale)
              return /^https?:\/\//i.test(localizedHref) ? (
                <a key={item.id ?? idx} href={localizedHref} target="_blank" rel="noreferrer noopener" className="block-media-gallery__link">
                  <figure
                    className="block-media-gallery__item tma-surface-lift"
                    style={{ ['--gallery-aspect-ratio' as string]: aspectRatio } as CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="block-media-gallery__image"
                      src={src}
                      alt={item.imageAlt?.trim() || item.caption?.trim() || 'Gallery image'}
                      width={960}
                      height={1200}
                      loading="lazy"
                    />
                    {item.caption?.trim() ? <figcaption className="block-media-gallery__caption">{item.caption.trim()}</figcaption> : null}
                  </figure>
                </a>
              ) : (
                <Link key={item.id ?? idx} href={localizedHref} className="block-media-gallery__link">
                  <figure
                    className="block-media-gallery__item tma-surface-lift"
                    style={{ ['--gallery-aspect-ratio' as string]: aspectRatio } as CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="block-media-gallery__image"
                      src={src}
                      alt={item.imageAlt?.trim() || item.caption?.trim() || 'Gallery image'}
                      width={960}
                      height={1200}
                      loading="lazy"
                    />
                    {item.caption?.trim() ? <figcaption className="block-media-gallery__caption">{item.caption.trim()}</figcaption> : null}
                  </figure>
                </Link>
              )
            })}
          </div>
        </div>
      )
    }
    case 'download': {
      if (!block.fileUrl?.trim()) {
        return <p className="tma-muted">Add a file URL for this download in the CMS.</p>
      }
      return (
        <div className="block-download tma-glass-card tma-surface-lift">
          <h3 className="block-download__title">{block.title}</h3>
          {block.description ? <p className="block-download__desc">{block.description}</p> : null}
          <p className="block-download__action">
            <CtaButton
              label={block.fileLabel?.trim() || 'Download'}
              href={block.fileUrl}
              variant="secondary"
              locale={locale}
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
  locale?: PublicLocale
  selectedBlockId?: string | null
  isBuilderPreview?: boolean
  onSelectBlock?: (blockId: string) => void
}

export function PageLayout({
  page,
  blocks: blockSlice,
  embedShortcodeVars,
  locale = 'de',
  selectedBlockId = null,
  isBuilderPreview = false,
  onSelectBlock,
}: PageLayoutProps) {
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
          const effects = sectionEffectsFromBlock(block)
          const shellClass = [
            'block-shell',
            'tma-block-shell',
            effects.hoverPreset !== 'none'
              ? `tma-block-shell--hover-${effects.hoverPreset}`
              : '',
            effects.backgroundEffect !== 'none'
              ? `tma-block-shell--fx-${effects.backgroundEffect}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <SectionOuter
              key={key}
              page={page}
              block={block}
              selectedBlockId={selectedBlockId}
              isBuilderPreview={isBuilderPreview}
              onSelectBlock={onSelectBlock}
            >
              <Reveal
                className={shellClass}
                variant={effects.revealVariant}
                delay={effects.animationPreset === 'none' ? undefined : effects.revealDelay}
              >
                {effects.backgroundEffect === 'glow' ? (
                  <SectionGlow className="tma-block-shell__glow" tone="lime" />
                ) : null}
                {effects.backgroundEffect === 'noise' ? (
                  <NoiseOverlay className="tma-block-shell__noise" strength="soft" />
                ) : null}
                {effects.backgroundEffect === 'orb' ? (
                  <div className="tma-block-shell__orb" aria-hidden="true" />
                ) : null}
                {renderBlock(
                  block,
                  page,
                  locale,
                  embedShortcodeVars,
                  effects.heroEffect,
                )}
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
          locale={locale}
        />
      ) : null}
    </>
  )
}
