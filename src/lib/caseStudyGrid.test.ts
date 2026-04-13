import { describe, expect, it } from 'vitest'

import { resolveCaseStudyGridSelectionMode, resolveCaseStudyGridStudies } from '@/lib/caseStudyGrid'
import type { CaseStudy } from '@/types/cms'

function makeCaseStudy(id: number, active = true, updatedAt = '2026-04-10T12:00:00.000Z'): CaseStudy {
  return {
    id,
    title: `Study ${id}`,
    slug: `study-${id}`,
    summary: null,
    active,
    updatedAt,
    createdAt: updatedAt,
  }
}

describe('resolveCaseStudyGridSelectionMode', () => {
  it('treats legacy blocks with selected studies as manual', () => {
    expect(resolveCaseStudyGridSelectionMode({ studies: [1, 2, 3] })).toBe('manual')
  })

  it('treats legacy blocks with no selected studies as automatic', () => {
    expect(resolveCaseStudyGridSelectionMode({ studies: [] })).toBe('automatic')
  })
})

describe('resolveCaseStudyGridStudies', () => {
  it('returns manual studies unchanged in manual mode', () => {
    const manual = [makeCaseStudy(1), makeCaseStudy(2)]
    const automatic = [makeCaseStudy(3)]
    expect(resolveCaseStudyGridStudies({ selectionMode: 'manual' }, manual, automatic)).toEqual(manual)
  })

  it('returns only active studies in automatic mode sorted newest first', () => {
    const studies = [
      makeCaseStudy(1, true, '2026-04-08T12:00:00.000Z'),
      makeCaseStudy(2, false, '2026-04-10T12:00:00.000Z'),
      makeCaseStudy(3, true, '2026-04-09T12:00:00.000Z'),
      makeCaseStudy(4, true, '2026-04-09T12:00:00.000Z'),
    ]
    const resolved = resolveCaseStudyGridStudies({ selectionMode: 'automatic' }, [], studies)
    expect(resolved.map((study) => study.id)).toEqual([4, 3, 1])
  })
})
