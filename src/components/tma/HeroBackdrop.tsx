import { MotionHeading } from '@/components/motion/MotionHeading'
import { NoiseOverlay } from '@/components/motion/NoiseOverlay'
import { SectionGlow } from '@/components/motion/SectionGlow'
import { absoluteMediaUrl } from '@/lib/mediaUrl'
import type { PublicLocale } from '@/lib/publicLocale'
import type { Media } from '@/types/cms'
import type { CSSProperties } from 'react'

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
  backgroundTone?: 'black' | 'charcoal' | 'olive' | null
  backgroundColor?: string | null
  backgroundOpacity?: number | null
  shadowStrength?: 'light' | 'medium' | 'strong' | null
  heroEffect?: 'none' | 'rotating-text' | 'canvas-accent'
  locale?: PublicLocale
}

function isHexColor(value: string | null | undefined): value is string {
  if (!value) return false
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

function hexToRgba(hex: string, opacityPercent: number): string {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized
  const red = Number.parseInt(expanded.slice(0, 2), 16)
  const green = Number.parseInt(expanded.slice(2, 4), 16)
  const blue = Number.parseInt(expanded.slice(4, 6), 16)
  const alpha = Math.max(0, Math.min(opacityPercent, 100)) / 100
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized
  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
  }
}

function buildHeroOverlayStyle(input: {
  backgroundColor: string
  backgroundOpacity: number
  shadowStrength: 'light' | 'medium' | 'strong'
}): CSSProperties {
  const opacityFactor = Math.max(0, Math.min(input.backgroundOpacity, 100)) / 100
  const { red, green, blue } = hexToRgb(input.backgroundColor)
  const presets = {
    light: {
      scrimTop: 0.08,
      scrimMid: 0.48,
      scrimBottom: 0.88,
      baseOpacity: 0.42,
      baseBrightness: 0.68,
      blurOpacity: 0.42,
      titleShadowAlpha: 0.55,
      leadShadowAlpha: 0.45,
    },
    medium: {
      scrimTop: 0.2,
      scrimMid: 0.75,
      scrimBottom: 1,
      baseOpacity: 0.35,
      baseBrightness: 0.55,
      blurOpacity: 0.55,
      titleShadowAlpha: 0.85,
      leadShadowAlpha: 0.75,
    },
    strong: {
      scrimTop: 0.34,
      scrimMid: 0.86,
      scrimBottom: 1,
      baseOpacity: 0.28,
      baseBrightness: 0.46,
      blurOpacity: 0.62,
      titleShadowAlpha: 0.95,
      leadShadowAlpha: 0.86,
    },
  } as const
  const preset = presets[input.shadowStrength]
  const scrim = `linear-gradient(180deg, rgba(${red}, ${green}, ${blue}, ${preset.scrimTop * opacityFactor}) 0%, rgba(${red}, ${green}, ${blue}, ${preset.scrimMid * opacityFactor}) 55%, rgba(${red}, ${green}, ${blue}, ${preset.scrimBottom * opacityFactor}) 100%)`
  const brightness = 1 - (1 - preset.baseBrightness) * opacityFactor

  return {
    '--tma-hero-bg': hexToRgba(input.backgroundColor, input.backgroundOpacity),
    '--tma-hero-scrim': scrim,
    '--tma-hero-base-opacity': String(preset.baseOpacity * opacityFactor),
    '--tma-hero-base-brightness': String(brightness),
    '--tma-hero-blur-opacity': String(preset.blurOpacity * opacityFactor),
    '--tma-hero-title-shadow': `0 2px 28px rgba(0, 0, 0, ${preset.titleShadowAlpha * opacityFactor})`,
    '--tma-hero-lead-shadow': `0 1px 18px rgba(0, 0, 0, ${preset.leadShadowAlpha * opacityFactor})`,
  } as CSSProperties
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
  backgroundTone = 'black',
  backgroundColor,
  backgroundOpacity = 100,
  shadowStrength = 'medium',
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
  const sectionStyle =
    isHexColor(backgroundColor)
      ? buildHeroOverlayStyle({
          backgroundColor,
          backgroundOpacity: backgroundOpacity ?? 100,
          shadowStrength: shadowStrength ?? 'medium',
        })
      : undefined

  return (
    <section
      className={`tma-hero tma-hero--${height ?? 'medium'} tma-hero--bg-${backgroundTone ?? 'black'} tma-hero--shadow-${shadowStrength ?? 'medium'}${size === 'block' ? ' block-hero tma-block-hero--inner' : ''}`}
      aria-labelledby={headingId}
      style={sectionStyle}
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
