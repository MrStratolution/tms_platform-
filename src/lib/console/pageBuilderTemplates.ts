import { createDefaultLayoutBlock } from '@/lib/cms/layoutBlockPresets'

export type BuilderTemplateId =
  | 'landing-fast'
  | 'service-authority'
  | 'contact-convert'
  | 'product-sales'

export function buildTemplateLayout(id: BuilderTemplateId) {
  switch (id) {
    case 'landing-fast':
      return [
        createDefaultLayoutBlock('imageBanner'),
        createDefaultLayoutBlock('proofBar'),
        createDefaultLayoutBlock('textMedia'),
        createDefaultLayoutBlock('cta'),
      ]
    case 'service-authority':
      return [
        createDefaultLayoutBlock('imageBanner'),
        createDefaultLayoutBlock('stats'),
        createDefaultLayoutBlock('process'),
        createDefaultLayoutBlock('testimonialSlider'),
        createDefaultLayoutBlock('faq'),
      ]
    case 'contact-convert':
      return [
        createDefaultLayoutBlock('imageBanner'),
        createDefaultLayoutBlock('form'),
        createDefaultLayoutBlock('booking'),
        createDefaultLayoutBlock('faq'),
      ]
    case 'product-sales':
      return [
        createDefaultLayoutBlock('imageBanner'),
        createDefaultLayoutBlock('pricing'),
        createDefaultLayoutBlock('comparison'),
        createDefaultLayoutBlock('testimonialSlider'),
        createDefaultLayoutBlock('stickyCta'),
      ]
    default:
      return [createDefaultLayoutBlock('imageBanner')]
  }
}

