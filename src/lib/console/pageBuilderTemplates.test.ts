import { describe, expect, it } from 'vitest'

import { buildTemplateLayout } from '@/lib/console/pageBuilderTemplates'

describe('buildTemplateLayout', () => {
  it('returns a non-empty layout for each template', () => {
    const ids = [
      'landing-fast',
      'service-authority',
      'contact-convert',
      'product-sales',
      'services-directory',
      'industries-directory',
      'work-showcase',
      'projects-directory',
      'news-index',
      'news-article',
    ] as const
    for (const id of ids) {
      const layout = buildTemplateLayout(id)
      expect(layout.length).toBeGreaterThan(0)
      expect(layout.every((b) => typeof b === 'object' && b != null && 'blockType' in b)).toBe(true)
    }
  })

  it('includes conversion block in contact template', () => {
    const layout = buildTemplateLayout('contact-convert')
    const types = layout.map((b) => (b as { blockType: string }).blockType)
    expect(types).toContain('form')
    expect(types).toContain('booking')
  })

  it('creates library-backed services and industries templates', () => {
    const services = buildTemplateLayout('services-directory')
    const industries = buildTemplateLayout('industries-directory')

    expect((services[0] as { blockType: string }).blockType).toBe('servicesFocus')
    expect((services[0] as { sourceMode?: string }).sourceMode).toBe('library')
    expect((industries[0] as { blockType: string }).blockType).toBe('industryGrid')
  })
})
