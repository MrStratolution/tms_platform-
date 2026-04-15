import { createDefaultLayoutBlock } from '@/lib/cms/layoutBlockPresets'

export type BuilderTemplateId =
  | 'landing-fast'
  | 'service-authority'
  | 'contact-convert'
  | 'product-sales'
  | 'services-directory'
  | 'industries-directory'
  | 'work-showcase'
  | 'projects-directory'
  | 'news-index'
  | 'news-article'

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
    case 'services-directory':
      return [
        {
          ...createDefaultLayoutBlock('servicesFocus'),
          sourceMode: 'library',
          selectionMode: 'automatic',
          items: [],
          sectionTitle: 'Leistungsübersicht',
          intro: 'Aktive Service-Einträge aus der Bibliothek erscheinen hier automatisch.',
          ctaLabel: 'Kontakt aufnehmen',
          ctaHref: '/contact',
        },
        createDefaultLayoutBlock('proofBar'),
        createDefaultLayoutBlock('cta'),
      ]
    case 'industries-directory':
      return [
        {
          ...createDefaultLayoutBlock('industryGrid'),
          selectionMode: 'automatic',
          sectionTitle: 'Branchen im Fokus',
          intro: 'Aktive Branchen aus der Bibliothek erscheinen hier automatisch.',
          ctaLabel: 'Kontakt aufnehmen',
          ctaHref: '/contact',
        },
        createDefaultLayoutBlock('cta'),
      ]
    case 'work-showcase':
      return [
        createDefaultLayoutBlock('featuredProjectSpotlight'),
        {
          ...createDefaultLayoutBlock('caseStudyGrid'),
          selectionMode: 'automatic',
          sectionTitle: 'Aktuelle Case Studies',
        },
        createDefaultLayoutBlock('cta'),
      ]
    case 'projects-directory':
      return [
        {
          ...createDefaultLayoutBlock('productFeed'),
          sectionTitle: 'Projekte & Produkte',
          contentKinds: ['project', 'product', 'concept', 'system', 'initiative'],
          showOnlyProjectFeedEligible: false,
          showAllPublished: true,
        },
        createDefaultLayoutBlock('cta'),
      ]
    case 'news-index':
      return [
        {
          ...createDefaultLayoutBlock('resourceFeed'),
          sectionTitle: 'News & Blog',
          showAllPublished: true,
          intro: 'Veröffentlichte Resource-Seiten erscheinen hier automatisch.',
        },
        createDefaultLayoutBlock('cta'),
      ]
    case 'news-article':
      return [
        createDefaultLayoutBlock('imageBanner'),
        createDefaultLayoutBlock('rich'),
        createDefaultLayoutBlock('cta'),
      ]
    default:
      return [createDefaultLayoutBlock('imageBanner')]
  }
}
