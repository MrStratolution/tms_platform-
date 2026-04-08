import type { Page } from '@/types/cms'

type JsonRecord = Record<string, unknown>
type LayoutBlock = NonNullable<Page['layout']>[number]
type HeroBlock = Extract<LayoutBlock, { blockType: 'hero' }>

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function cloneLayout(layout: unknown): LayoutBlock[] {
  if (!Array.isArray(layout)) return []
  return layout
    .filter((block) => isRecord(block))
    .map((block) => ({ ...(block as unknown as LayoutBlock) }))
}

function hasHeroBlock(layout: LayoutBlock[]): boolean {
  return layout.some((block) => block.blockType === 'hero')
}

function clampLegacyInsertIndex(raw: unknown, mainCount: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  const normalized = Math.floor(raw)
  return Math.max(0, Math.min(normalized, mainCount))
}

export function getFirstHeroBlockIndex(layout: Page['layout'] | undefined | null): number {
  if (!Array.isArray(layout)) return -1
  return layout.findIndex((block) => block?.blockType === 'hero')
}

export function getPrimaryHeroBlock(
  layout: Page['layout'] | undefined | null,
): HeroBlock | null {
  const index = getFirstHeroBlockIndex(layout)
  if (index < 0 || !layout) return null
  const block = layout[index]
  return block?.blockType === 'hero' ? block : null
}

export function patchPrimaryHeroBlock(
  layout: Page['layout'] | undefined | null,
  patch: Partial<HeroBlock>,
): Page['layout'] | undefined {
  if (!Array.isArray(layout)) return layout ?? undefined
  const index = getFirstHeroBlockIndex(layout)
  if (index < 0) return layout
  return layout.map((block, currentIndex) => {
    if (currentIndex !== index || block?.blockType !== 'hero') return block
    return { ...block, ...patch }
  })
}

function buildLegacyHeroBlock(
  document: JsonRecord,
  fallbackBlockId = 'legacy-page-hero',
): HeroBlock | null {
  const hero = isRecord(document.hero) ? document.hero : null
  const headline = typeof hero?.headline === 'string' ? hero.headline.trim() : ''
  if (!headline) return null

  const cta = isRecord(document.primaryCta) ? document.primaryCta : null
  const ctaLabel = typeof cta?.label === 'string' ? cta.label.trim() : ''
  const ctaHref = typeof cta?.href === 'string' ? cta.href.trim() : ''

  const next: HeroBlock = {
    blockType: 'hero',
    id: fallbackBlockId,
    headline,
  }

  if (typeof hero?.subheadline === 'string' && hero.subheadline.trim()) {
    next.subheadline = hero.subheadline.trim()
  }
  if (hero?.backgroundMedia != null) {
    next.backgroundMedia = hero.backgroundMedia as HeroBlock['backgroundMedia']
  }
  if (ctaLabel) next.ctaLabel = ctaLabel
  if (ctaHref) next.ctaHref = ctaHref

  return next
}

function insertLegacyHeroBlock(
  layout: LayoutBlock[],
  heroBlock: HeroBlock,
  rawInsertIndex: unknown,
): LayoutBlock[] {
  const stickyBlocks = layout.filter((block) => block.blockType === 'stickyCta')
  const mainBlocks = layout.filter((block) => block.blockType !== 'stickyCta')
  const insertIndex = clampLegacyInsertIndex(rawInsertIndex, mainBlocks.length)
  return [
    ...mainBlocks.slice(0, insertIndex),
    heroBlock,
    ...mainBlocks.slice(insertIndex),
    ...stickyBlocks,
  ]
}

export function canonicalizeHeroDocument(
  document: JsonRecord,
  opts?: {
    stripLegacyFields?: boolean
    fallbackBlockId?: string
    preferLegacyValuesForExistingHero?: boolean
  },
): { document: JsonRecord; autoConvertedLegacyHero: boolean } {
  const next: JsonRecord = { ...document }
  const layout = cloneLayout(next.layout)
  const legacyHero = buildLegacyHeroBlock(next, opts?.fallbackBlockId)
  const hasExistingHero = hasHeroBlock(layout)

  if (legacyHero && !hasExistingHero) {
    next.layout = insertLegacyHeroBlock(layout, legacyHero, next.heroInsertIndex)
  } else if (
    legacyHero &&
    hasExistingHero &&
    opts?.preferLegacyValuesForExistingHero
  ) {
    const { id: _omitId, blockType: _omitType, ...heroPatch } = legacyHero
    void _omitId
    void _omitType
    next.layout = patchPrimaryHeroBlock(layout, heroPatch) ?? layout
  } else if (Array.isArray(next.layout)) {
    next.layout = layout
  }

  if (opts?.stripLegacyFields) {
    delete next.hero
    delete next.primaryCta
    delete next.heroInsertIndex
  }

  return {
    document: next,
    autoConvertedLegacyHero: Boolean(legacyHero && !hasExistingHero),
  }
}

export function canonicalizePageHero(page: Page): Page {
  const normalized = canonicalizeHeroDocument(page as unknown as JsonRecord)
  return {
    ...page,
    ...(normalized.document as Partial<Page>),
  }
}
