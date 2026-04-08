import type { Page, Product, ProductContentKind } from '@/types/cms'

type ProductFeedBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'productFeed' }>

export const PROJECT_FEED_ALLOWED_KINDS: ProductContentKind[] = [
  'project',
  'concept',
  'system',
  'initiative',
]

export function normalizeProductContentKind(value: unknown): ProductContentKind {
  switch (value) {
    case 'project':
    case 'concept':
    case 'system':
    case 'initiative':
      return value
    default:
      return 'product'
  }
}

export function productHasLocaleCoverage(product: Product, locale?: string | null): boolean {
  const target = locale?.trim().toLowerCase()
  if (!target || target === 'de') return true
  const doc =
    product.document && typeof product.document === 'object' && !Array.isArray(product.document)
      ? (product.document as Record<string, unknown>)
      : null
  const localizations =
    doc?.localizations && typeof doc.localizations === 'object' && !Array.isArray(doc.localizations)
      ? (doc.localizations as Record<string, unknown>)
      : null
  if (!localizations) return false
  const exact = localizations[target]
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) return true
  const short = target.split('-')[0]
  if (!short || short === target) return false
  const fallback = localizations[short]
  return Boolean(fallback && typeof fallback === 'object' && !Array.isArray(fallback))
}

export function resolveProductFeedSelectionMode(
  block: Partial<ProductFeedBlock> & {
    products?: ProductFeedBlock['products']
    showAllPublished?: boolean | null
  },
): 'manual' | 'automatic' | 'hybrid' {
  if (block.selectionMode === 'manual' || block.selectionMode === 'automatic' || block.selectionMode === 'hybrid') {
    return block.selectionMode
  }
  const hasManualRows = Array.isArray(block.products) && block.products.length > 0
  return block.showAllPublished === true && !hasManualRows ? 'automatic' : 'manual'
}

function normalizeContentKindFilter(
  block: Partial<ProductFeedBlock>,
): ProductContentKind[] | null {
  const raw = Array.isArray(block.contentKinds) ? block.contentKinds : []
  const normalized = raw
    .map((value) => normalizeProductContentKind(value))
    .filter((value, index, arr) => arr.indexOf(value) === index)
  return normalized.length > 0 ? normalized : null
}

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: 'asc' | 'desc',
) {
  const aNull = a == null || !Number.isFinite(a)
  const bNull = b == null || !Number.isFinite(b)
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  return direction === 'asc' ? a! - b! : b! - a!
}

function compareNullableDate(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: 'asc' | 'desc',
) {
  const aTime = a ? Date.parse(a) : Number.NaN
  const bTime = b ? Date.parse(b) : Number.NaN
  const aNull = !Number.isFinite(aTime)
  const bNull = !Number.isFinite(bTime)
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  return direction === 'asc' ? aTime - bTime : bTime - aTime
}

function compareProductsStable(a: Product, b: Product) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  if (Number.isFinite(updatedDiff) && updatedDiff !== 0) return updatedDiff
  return a.name.localeCompare(b.name, 'de')
}

function filterAutomaticProducts(
  block: Partial<ProductFeedBlock>,
  products: Product[],
  locale?: string | null,
): Product[] {
  const requireProjectEligible = block.showOnlyProjectFeedEligible !== false
  const explicitKinds = normalizeContentKindFilter(block)
  const allowedKinds =
    requireProjectEligible
      ? explicitKinds
        ? explicitKinds.filter((kind) => PROJECT_FEED_ALLOWED_KINDS.includes(kind))
        : PROJECT_FEED_ALLOWED_KINDS
      : explicitKinds

  return products.filter((product) => {
    if (product.status !== 'published') return false
    if (!productHasLocaleCoverage(product, locale)) return false

    const contentKind = normalizeProductContentKind(product.contentKind)
    if (requireProjectEligible) {
      if (product.showInProjectFeeds !== true) return false
      if (!PROJECT_FEED_ALLOWED_KINDS.includes(contentKind)) return false
    }
    if (allowedKinds && !allowedKinds.includes(contentKind)) return false
    return true
  })
}

function sortAutomaticProducts(
  block: Partial<ProductFeedBlock>,
  products: Product[],
): Product[] {
  const sortBy = block.sortBy === 'publishedAt' || block.sortBy === 'manual'
    ? block.sortBy
    : 'listingPriority'
  const direction = block.sortDirection === 'desc' ? 'desc' : 'asc'
  if (sortBy === 'manual') return [...products]

  return [...products].sort((a, b) => {
    const primary =
      sortBy === 'publishedAt'
        ? compareNullableDate(a.publishedAt, b.publishedAt, direction)
        : compareNullableNumber(a.listingPriority, b.listingPriority, direction)
    if (primary !== 0) return primary

    const secondary =
      sortBy === 'publishedAt'
        ? compareNullableNumber(a.listingPriority, b.listingPriority, 'asc')
        : compareNullableDate(a.publishedAt, b.publishedAt, 'desc')
    if (secondary !== 0) return secondary

    return compareProductsStable(a, b)
  })
}

function uniqueById(products: Product[]): Product[] {
  const seen = new Set<number>()
  return products.filter((product) => {
    if (seen.has(product.id)) return false
    seen.add(product.id)
    return true
  })
}

export function resolveProductFeedProducts(
  block: Partial<ProductFeedBlock>,
  manualProducts: Product[],
  allPublishedProducts: Product[],
  locale?: string | null,
): Product[] {
  const mode = resolveProductFeedSelectionMode(block)
  const featuredId =
    block.featuredProduct && typeof block.featuredProduct === 'object' && 'id' in block.featuredProduct
      ? Number((block.featuredProduct as { id?: unknown }).id)
      : typeof block.featuredProduct === 'number'
        ? block.featuredProduct
        : null
  const filteredManual = uniqueById(manualProducts)
  if (mode === 'manual') return filteredManual

  const automatic = sortAutomaticProducts(
    block,
    filterAutomaticProducts(block, allPublishedProducts, locale),
  ).filter((product) => product.id !== featuredId)

  if (mode === 'automatic') {
    return automatic
  }

  const manualIds = new Set(filteredManual.map((product) => product.id))
  const combined = [...filteredManual]
  for (const product of automatic) {
    if (manualIds.has(product.id)) continue
    combined.push(product)
  }
  return combined
}
