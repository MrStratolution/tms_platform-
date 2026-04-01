import type { LayoutBlockChromeFields, Page } from '@/types/cms'

export type SectionSpacingToken = 'none' | 'sm' | 'md' | 'lg'

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
  sm: { paddingBlock: 'clamp(1.5rem, 4vw, 2.5rem)' },
  md: { paddingBlock: 'clamp(2rem, 6vw, 4rem)' },
  lg: { paddingBlock: 'clamp(3rem, 10vw, 6rem)' },
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
  return {
    anchorId: typeof o.anchorId === 'string' ? o.anchorId : undefined,
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
    customClass: typeof o.customClass === 'string' ? o.customClass : undefined,
    sectionHidden: typeof o.sectionHidden === 'boolean' ? o.sectionHidden : undefined,
    hideOnDesktop: typeof o.hideOnDesktop === 'boolean' ? o.hideOnDesktop : undefined,
    hideOnMobile: typeof o.hideOnMobile === 'boolean' ? o.hideOnMobile : undefined,
  }
}

export function sanitizePageCustomCss(css: string | null | undefined): string {
  if (!css?.trim()) return ''
  const t = css.trim().slice(0, 100_000)
  if (/<\/style/i.test(t) || /<script/i.test(t)) return ''
  return t
}
