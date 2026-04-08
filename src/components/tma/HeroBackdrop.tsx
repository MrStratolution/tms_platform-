import { MotionHeading } from '@/components/motion/MotionHeading'
import { NoiseOverlay } from '@/components/motion/NoiseOverlay'
import { SectionGlow } from '@/components/motion/SectionGlow'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type { PublicLocale } from '@/lib/publicLocale'
import type { Media } from '@/types/cms'

import { CtaButton } from './CtaButton'

type Props = {
  title: React.ReactNode
  lead?: React.ReactNode
  media?: number | Media | null | undefined
  mediaUrl?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
  secondaryCtaLabel?: string | null
  secondaryCtaHref?: string | null
  /** e.g. page-level primary CTA under headline */
  footerSlot?: React.ReactNode
  /** Slightly smaller type scale for in-flow layout blocks */
  size?: 'page' | 'block'
  /** Unique id for the `<h1>` (avoid duplicates when multiple heroes on a page). */
  headingId?: string
  tabletImageUrl?: string | null
  mobileImageUrl?: string | null
  height?: 'short' | 'medium' | 'tall' | null
  mediaFit?: 'cover' | 'contain' | null
  mediaPositionX?: 'left' | 'center' | 'right' | null
  mediaPositionY?: 'top' | 'center' | 'bottom' | null
  heroEffect?: 'none' | 'rotating-text' | 'canvas-accent'
  locale?: PublicLocale
}

export function HeroBackdrop({
  title,
  lead,
  media,
  mediaUrl,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  footerSlot,
  size = 'page',
  headingId = 'tma-hero-heading',
  tabletImageUrl,
  mobileImageUrl,
  height = 'medium',
  mediaFit = 'cover',
  mediaPositionX = 'center',
  mediaPositionY = 'center',
  heroEffect = 'none',
  locale = 'de',
}: Props) {
  const m = typeof media === 'object' && media != null ? media : null
  const src = mediaUrl || (m ? absoluteMediaUrl(m.url) : null)
  const tabletSrc = tabletImageUrl ? absoluteMediaUrl(tabletImageUrl) : null
  const mobileSrc = mobileImageUrl ? absoluteMediaUrl(mobileImageUrl) : null
  const objectPosition = `${mediaPositionX ?? 'center'} ${mediaPositionY ?? 'center'}`
  const layerStyle = src
    ? {
        backgroundImage: `url(${src})`,
        backgroundSize: mediaFit ?? 'cover',
        backgroundPosition: objectPosition,
      }
    : undefined

  const responsiveCss =
    (tabletSrc || mobileSrc) && src
      ? [
          tabletSrc
            ? `@media(max-width:1024px){.tma-hero__blur,.tma-hero__base{background-image:url(${tabletSrc})!important;background-size:${mediaFit ?? 'cover'}!important;background-position:${objectPosition}!important}}`
            : '',
          mobileSrc
            ? `@media(max-width:768px){.tma-hero__blur,.tma-hero__base{background-image:url(${mobileSrc})!important;background-size:${mediaFit ?? 'cover'}!important;background-position:${objectPosition}!important}}`
            : '',
        ]
          .filter(Boolean)
          .join('')
      : null

  return (
    <section
      className={`tma-hero tma-hero--${height ?? 'medium'}${size === 'block' ? ' block-hero tma-block-hero--inner' : ''}`}
      aria-labelledby={headingId}
    >
      {responsiveCss ? <style dangerouslySetInnerHTML={{ __html: responsiveCss }} /> : null}
      <div className="tma-hero__layers" aria-hidden="true">
        {src ? (
          <>
            <div className="tma-hero__blur" style={layerStyle} />
            <div className="tma-hero__base" style={layerStyle} />
          </>
        ) : (
          <div className="tma-hero__mesh" />
        )}
        <div className="tma-hero__scrim" />
        <SectionGlow className="tma-hero__glow" tone="lime" />
        <NoiseOverlay className="tma-hero__noise" strength="soft" />
      </div>
      <div className="tma-hero__content">
        {heroEffect === 'canvas-accent' ? (
          <div className="tma-hero__canvas-accent" aria-hidden="true" />
        ) : null}
        {typeof title === 'string' ? (
          <MotionHeading
            as="h1"
            id={headingId}
            className="tma-hero__title"
            text={title}
            intervalMs={2600}
            enabled={heroEffect === 'rotating-text'}
          />
        ) : (
          <h1 id={headingId} className="tma-hero__title">
            {title}
          </h1>
        )}
        {lead ? <div className="tma-hero__lead">{lead}</div> : null}
        {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) || footerSlot ? (
          <div className="tma-hero__cta-row">
            {ctaLabel && ctaHref ? (
              <CtaButton label={ctaLabel} href={ctaHref} variant="primary" locale={locale} />
            ) : null}
            {secondaryCtaLabel && secondaryCtaHref ? (
              <CtaButton label={secondaryCtaLabel} href={secondaryCtaHref} variant="ghost" locale={locale} />
            ) : null}
            {footerSlot}
          </div>
        ) : null}
      </div>
    </section>
  )
}
