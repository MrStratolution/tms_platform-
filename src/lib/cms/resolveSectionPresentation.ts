import type { LayoutBlockChromeFields, Page } from '@/types/cms'
import type { RevealVariant } from '@/components/motion/Reveal'

export type SectionSpacingToken = 'none' | 'sm' | 'md' | 'lg'
export type SectionAnimationPreset =
  | 'inherit'
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-blur'
  | 'scale-in'
export type SectionHoverPreset =
  | 'inherit'
  | 'none'
  | 'lift'
  | 'scale'
  | 'glow'
  | 'border-highlight'
export type SectionBackgroundEffect =
  | 'inherit'
  | 'none'
  | 'glow'
  | 'glass'
  | 'noise'
  | 'orb'
export type SectionHeroEffect = 'inherit' | 'none' | 'rotating-text' | 'canvas-accent'

export type ResolvedSectionEffects = {
  animationPreset: Exclude<SectionAnimationPreset, 'inherit'>
  revealVariant: RevealVariant
  revealDelay?: number
  hoverPreset: Exclude<SectionHoverPreset, 'inherit'>
  backgroundEffect: Exclude<SectionBackgroundEffect, 'inherit'>
  heroEffect: Exclude<SectionHeroEffect, 'inherit'>
}

const PAGE_SPACING_TO_BLOCK_DEFAULT: Record<
  NonNullable<Page['sectionSpacingPreset']>,
  SectionSpacingToken | undefined
> = {
  inherit: undefined,
  compact: 'sm',
  default: 'md',
  comfortable: 'md',
  spacious: 'lg',
}

const SPACING_CSS: Record<SectionSpacingToken, { paddingBlock: string }> = {
  none: { paddingBlock: '0' },
  sm: { paddingBlock: 'clamp(1.25rem, 3vw, 2rem)' },
  md: { paddingBlock: 'clamp(1.75rem, 4.5vw, 3rem)' },
  lg: { paddingBlock: 'clamp(2.5rem, 7vw, 4.5rem)' },
}

function effectiveBlockSpacing(
  page: Page,
  chrome: LayoutBlockChromeFields | undefined,
): SectionSpacingToken {
  const raw = chrome?.sectionSpacingY
  if (raw && raw !== 'inherit') {
    if (raw === 'none' || raw === 'sm' || raw === 'md' || raw === 'lg') return raw
  }
  const preset = page.sectionSpacingPreset
  if (preset && preset !== 'inherit') {
    const mapped = PAGE_SPACING_TO_BLOCK_DEFAULT[preset]
    if (mapped) return mapped
  }
  return 'md'
}

export function resolveSectionSpacingStyle(page: Page, chrome: LayoutBlockChromeFields | undefined) {
  const token = effectiveBlockSpacing(page, chrome)
  return { paddingBlock: SPACING_CSS[token].paddingBlock }
}

export function resolveSectionWidthClass(
  page: Page,
  chrome: LayoutBlockChromeFields | undefined,
): string {
  const w = chrome?.widthMode
  if (w === 'narrow') return 'tma-block-shell--narrow'
  if (w === 'full') return 'tma-block-shell--full'
  if (w === 'default') return 'tma-block-shell--default'
  const pageW = page.maxWidthMode
  if (pageW === 'narrow') return 'tma-block-shell--narrow'
  if (pageW === 'full') return 'tma-block-shell--full'
  return 'tma-block-shell--default'
}

export function sectionChromeFromBlock(block: unknown): LayoutBlockChromeFields {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return {}
  const o = block as Record<string, unknown>
  const unitValue = (value: unknown) =>
    value === 'px' || value === '%' || value === 'em' || value === 'rem' || value === 'vw'
      ? value
      : undefined
  return {
    anchorId: typeof o.anchorId === 'string' ? o.anchorId : undefined,
    marginTop: typeof o.marginTop === 'string' ? o.marginTop : undefined,
    marginRight: typeof o.marginRight === 'string' ? o.marginRight : undefined,
    marginBottom: typeof o.marginBottom === 'string' ? o.marginBottom : undefined,
    marginLeft: typeof o.marginLeft === 'string' ? o.marginLeft : undefined,
    paddingTop: typeof o.paddingTop === 'string' ? o.paddingTop : undefined,
    paddingRight: typeof o.paddingRight === 'string' ? o.paddingRight : undefined,
    paddingBottom: typeof o.paddingBottom === 'string' ? o.paddingBottom : undefined,
    paddingLeft: typeof o.paddingLeft === 'string' ? o.paddingLeft : undefined,
    marginUnit: unitValue(o.marginUnit),
    paddingUnit: unitValue(o.paddingUnit),
    sectionSpacingY:
      o.sectionSpacingY === 'inherit' ||
      o.sectionSpacingY === 'none' ||
      o.sectionSpacingY === 'sm' ||
      o.sectionSpacingY === 'md' ||
      o.sectionSpacingY === 'lg'
        ? o.sectionSpacingY
        : undefined,
    widthMode:
      o.widthMode === 'inherit' ||
      o.widthMode === 'default' ||
      o.widthMode === 'narrow' ||
      o.widthMode === 'full'
        ? o.widthMode
        : undefined,
    zIndex: typeof o.zIndex === 'number' ? o.zIndex : undefined,
    animationPreset:
      o.animationPreset === 'inherit' ||
      o.animationPreset === 'none' ||
      o.animationPreset === 'fade' ||
      o.animationPreset === 'slide-up' ||
      o.animationPreset === 'slide-blur' ||
      o.animationPreset === 'scale-in'
        ? o.animationPreset
        : undefined,
    hoverPreset:
      o.hoverPreset === 'inherit' ||
      o.hoverPreset === 'none' ||
      o.hoverPreset === 'lift' ||
      o.hoverPreset === 'scale' ||
      o.hoverPreset === 'glow' ||
      o.hoverPreset === 'border-highlight'
        ? o.hoverPreset
        : undefined,
    backgroundEffect:
      o.backgroundEffect === 'inherit' ||
      o.backgroundEffect === 'none' ||
      o.backgroundEffect === 'glow' ||
      o.backgroundEffect === 'glass' ||
      o.backgroundEffect === 'noise' ||
      o.backgroundEffect === 'orb'
        ? o.backgroundEffect
        : undefined,
    heroEffect:
      o.heroEffect === 'inherit' ||
      o.heroEffect === 'none' ||
      o.heroEffect === 'rotating-text' ||
      o.heroEffect === 'canvas-accent'
        ? o.heroEffect
        : undefined,
    revealMode:
      o.revealMode === 'inherit' ||
      o.revealMode === 'default' ||
      o.revealMode === 'subtle' ||
      o.revealMode === 'blur' ||
      o.revealMode === 'slide-up' ||
      o.revealMode === 'stagger' ||
      o.revealMode === 'off'
        ? o.revealMode
        : undefined,
    revealDelay:
      typeof o.revealDelay === 'number' && o.revealDelay >= 0 && o.revealDelay <= 2000
        ? o.revealDelay
        : undefined,
    customClass: typeof o.customClass === 'string' ? o.customClass : undefined,
    sectionHidden: typeof o.sectionHidden === 'boolean' ? o.sectionHidden : undefined,
    hideOnDesktop: typeof o.hideOnDesktop === 'boolean' ? o.hideOnDesktop : undefined,
    hideOnMobile: typeof o.hideOnMobile === 'boolean' ? o.hideOnMobile : undefined,
  }
}

function defaultAnimationPresetForBlock(blockType: unknown): Exclude<SectionAnimationPreset, 'inherit'> {
  switch (blockType) {
    case 'hero':
    case 'promoBanner':
    case 'imageBanner':
    case 'testimonialSlider':
      return 'slide-blur'
    case 'stats':
    case 'iconRow':
    case 'pricing':
    case 'comparison':
    case 'teamGrid':
    case 'caseStudyGrid':
    case 'servicesFocus':
    case 'process':
      return 'slide-up'
    default:
      return 'fade'
  }
}

function animationPresetFromLegacyRevealMode(
  revealMode: LayoutBlockChromeFields['revealMode'],
): Exclude<SectionAnimationPreset, 'inherit'> | undefined {
  switch (revealMode) {
    case 'off':
      return 'none'
    case 'default':
      return 'fade'
    case 'subtle':
      return 'fade'
    case 'blur':
      return 'slide-blur'
    case 'slide-up':
      return 'slide-up'
    default:
      return undefined
  }
}

function revealVariantFromPreset(
  preset: Exclude<SectionAnimationPreset, 'inherit'>,
  revealMode?: LayoutBlockChromeFields['revealMode'],
): RevealVariant {
  switch (preset) {
    case 'none':
      return 'none'
    case 'slide-up':
      return 'slide-up'
    case 'slide-blur':
      return 'blur'
    case 'scale-in':
      return 'scale-in'
    case 'fade':
    default:
      return revealMode === 'subtle' ? 'subtle' : 'fade'
  }
}

export function sectionEffectsFromBlock(block: unknown): ResolvedSectionEffects {
  const chrome = sectionChromeFromBlock(block)
  const raw = block && typeof block === 'object' && !Array.isArray(block)
    ? (block as Record<string, unknown>)
    : {}

  const inheritedAnimation =
    animationPresetFromLegacyRevealMode(chrome.revealMode) ??
    defaultAnimationPresetForBlock(raw.blockType)
  const animationPreset =
    chrome.animationPreset && chrome.animationPreset !== 'inherit'
      ? chrome.animationPreset
      : inheritedAnimation
  const hoverPreset =
    chrome.hoverPreset && chrome.hoverPreset !== 'inherit' ? chrome.hoverPreset : 'none'
  const backgroundEffect =
    chrome.backgroundEffect && chrome.backgroundEffect !== 'inherit'
      ? chrome.backgroundEffect
      : 'none'
  const heroEffect =
    chrome.heroEffect && chrome.heroEffect !== 'inherit' ? chrome.heroEffect : 'none'

  return {
    animationPreset,
    revealVariant: revealVariantFromPreset(animationPreset, chrome.revealMode),
    revealDelay: chrome.revealDelay ?? undefined,
    hoverPreset,
    backgroundEffect,
    heroEffect,
  }
}

export function sanitizePageCustomCss(css: string | null | undefined): string {
  if (!css?.trim()) return ''
  const t = css.trim().slice(0, 100_000)
  if (/<\/style/i.test(t) || /<script/i.test(t)) return ''
  return t
}
