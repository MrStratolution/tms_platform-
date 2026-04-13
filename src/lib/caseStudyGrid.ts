import type { CaseStudy, Page } from '@/types/cms'

type CaseStudyGridBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'caseStudyGrid' }>

export function resolveCaseStudyGridSelectionMode(
  block: Partial<CaseStudyGridBlock>,
): 'manual' | 'automatic' {
  if (block.selectionMode === 'manual' || block.selectionMode === 'automatic') {
    return block.selectionMode
  }
  const hasManualRows = Array.isArray(block.studies) && block.studies.length > 0
  return hasManualRows ? 'manual' : 'automatic'
}

function compareCaseStudiesStable(a: CaseStudy, b: CaseStudy) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  if (Number.isFinite(updatedDiff) && updatedDiff !== 0) return updatedDiff
  return b.id - a.id
}

export function resolveCaseStudyGridStudies(
  block: Partial<CaseStudyGridBlock>,
  manualStudies: CaseStudy[],
  allCaseStudies: CaseStudy[],
): CaseStudy[] {
  const mode = resolveCaseStudyGridSelectionMode(block)
  if (mode === 'manual') return manualStudies
  return [...allCaseStudies]
    .filter((study) => study.active !== false)
    .sort(compareCaseStudiesStable)
}
