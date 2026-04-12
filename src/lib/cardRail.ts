export type CardRailVariant = 'team' | 'content'

export function shouldUseCardRail(itemCount: number, viewportWidth: number): boolean {
  if (!Number.isFinite(itemCount) || itemCount <= 1) return false
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return itemCount > 1
  if (viewportWidth < 768) return itemCount > 1
  if (viewportWidth < 1200) return itemCount > 2
  return itemCount > 3
}
