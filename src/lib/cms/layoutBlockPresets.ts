/** Presets for the console layout block editor (`page.document.layout`). */

export type LayoutBlockType =
  | 'hero'
  | 'cta'
  | 'stats'
  | 'faq'
  | 'textMedia'
  | 'video'
  | 'download'
  | 'stickyCta'
  | 'proofBar'
  | 'promoBanner'
  | 'imageBanner'
  | 'iconRow'
  | 'quoteBand'
  | 'process'
  | 'form'
  | 'booking'
  | 'testimonialSlider'
  | 'pricing'
  | 'comparison'
  | 'teamGrid'
  | 'caseStudyGrid'
  | 'rich'
  | 'spacer'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Deep-clone a saved block and assign a fresh `id` for inserting into a page layout. */
export function cloneLayoutBlockJson(raw: unknown): Record<string, unknown> {
  let o: Record<string, unknown>
  try {
    o =
      typeof structuredClone === 'function'
        ? (structuredClone(raw) as Record<string, unknown>)
        : {
            ...(typeof raw === 'object' && raw !== null && !Array.isArray(raw)
              ? (raw as Record<string, unknown>)
              : {}),
          }
  } catch {
    o =
      typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? { ...(raw as Record<string, unknown>) }
        : {}
  }
  if (typeof o.blockType !== 'string') {
    return createDefaultLayoutBlock('cta')
  }
  o.id = newId()
  return o
}

export const LAYOUT_BLOCK_ADD_OPTIONS: { value: LayoutBlockType; label: string }[] = [
  { value: 'hero', label: 'Hero section' },
  { value: 'cta', label: 'CTA button' },
  { value: 'stats', label: 'Stats / metrics' },
  { value: 'faq', label: 'FAQ' },
  { value: 'textMedia', label: 'Text + media' },
  { value: 'video', label: 'Video (embed)' },
  { value: 'download', label: 'Download / resource' },
  { value: 'stickyCta', label: 'Sticky CTA bar' },
  { value: 'proofBar', label: 'Logo strip' },
  { value: 'promoBanner', label: 'Promo banner (visual band)' },
  { value: 'imageBanner', label: 'Image banner (photo + overlay)' },
  { value: 'iconRow', label: 'Icon row (benefits / features)' },
  { value: 'quoteBand', label: 'Quote band (pull quote)' },
  { value: 'process', label: 'Process / timeline' },
  { value: 'form', label: 'Contact / lead form' },
  { value: 'booking', label: 'Booking widget' },
  { value: 'testimonialSlider', label: 'Testimonial slider' },
  { value: 'pricing', label: 'Pricing table' },
  { value: 'comparison', label: 'Comparison table' },
  { value: 'teamGrid', label: 'Team grid' },
  { value: 'caseStudyGrid', label: 'Case study grid' },
  { value: 'rich', label: 'Rich text (Lexical)' },
  { value: 'spacer', label: 'Spacer / divider' },
]

export function createDefaultLayoutBlock(blockType: LayoutBlockType): Record<string, unknown> {
  const id = newId()
  switch (blockType) {
    case 'hero':
      return {
        id,
        blockType: 'hero',
        headline: 'Your headline here',
        subheadline: 'Supporting text that explains your value proposition.',
        ctaLabel: 'Get started',
        ctaHref: '/contact',
        height: 'medium',
        mediaFit: 'cover',
        mediaPositionX: 'center',
        mediaPositionY: 'center',
      }
    case 'cta':
      return {
        id,
        blockType: 'cta',
        label: 'Get started',
        href: '/contact',
        variant: 'primary',
      }
    case 'stats':
      return {
        id,
        blockType: 'stats',
        variant: 'default',
        items: [
          { value: '24', suffix: '%', label: 'Qualified pipeline contribution', id: newId() },
          { value: '6', label: 'Weeks to first narrative and demand sprint', id: newId() },
        ],
      }
    case 'faq':
      return {
        id,
        blockType: 'faq',
        items: [
          { question: 'Question?', answer: 'Answer.', id: newId() },
        ],
      }
    case 'textMedia':
      return {
        id,
        blockType: 'textMedia',
        headline: 'Section headline',
        body: 'Supporting copy. Use quick fields in the page editor.',
        imageUrl: '/brand/tma-logo-black.png',
        imageAlt: 'Illustration',
        imagePosition: 'right',
        mediaWidth: 'default',
        aspectRatio: 'landscape',
        mediaFit: 'cover',
        mediaAlign: 'center',
        borderRadius: 'md',
        mediaPositionX: 'center',
        mediaPositionY: 'center',
      }
    case 'video':
      return {
        id,
        blockType: 'video',
        title: 'Video',
        sourceType: 'embed',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        width: 'default',
        height: 'auto',
        aspectRatio: 'landscape',
        mediaAlign: 'center',
        borderRadius: 'md',
      }
    case 'download':
      return {
        id,
        blockType: 'download',
        title: 'Resource title',
        description: 'Short description for this file.',
        fileUrl: '#',
        fileLabel: 'Download PDF',
      }
    case 'stickyCta':
      return {
        id,
        blockType: 'stickyCta',
        label: 'Book a call',
        href: '/book/strategy-call',
        variant: 'primary',
      }
    case 'proofBar':
      return {
        id,
        blockType: 'proofBar',
        logos: [],
      }
    case 'promoBanner':
      return {
        id,
        blockType: 'promoBanner',
        eyebrow: 'Spotlight',
        headline: 'Ready to sharpen your GTM story?',
        body: 'Short supporting line — swap this in the console. Great after hero or before a form.',
        ctaLabel: 'Book a call',
        ctaHref: '/contact',
        variant: 'gradient',
        align: 'center',
      }
    case 'imageBanner':
      return {
        id,
        blockType: 'imageBanner',
        imageUrl: '/brand/tma-logo-black.png',
        imageAlt: 'Banner image',
        headline: 'Headline over imagery',
        subheadline: 'Optional supporting line — use a wide photo from your media library or a URL.',
        ctaLabel: 'Learn more',
        ctaHref: '/services',
        overlay: 'medium',
        height: 'medium',
        mediaWidth: 'full',
        aspectRatio: 'auto',
        mediaFit: 'cover',
        mediaAlign: 'center',
        borderRadius: 'lg',
        mediaPositionX: 'center',
        mediaPositionY: 'center',
      }
    case 'iconRow':
      return {
        id,
        blockType: 'iconRow',
        sectionTitle: 'Why teams work with us',
        intro: 'Short intro under the title (optional).',
        items: [
          { id: newId(), icon: '◆', title: 'Clear positioning', body: 'One story from homepage to security review.' },
          { id: newId(), icon: '◇', title: 'Demand that matches sales', body: 'Creative and landing paths AEs can repeat.' },
          { id: newId(), icon: '○', title: 'Measurable pipeline', body: 'Attribution tuned for long eval cycles.' },
        ],
      }
    case 'quoteBand':
      return {
        id,
        blockType: 'quoteBand',
        quote: 'Add a memorable line from a customer, leader, or internal principle.',
        attribution: 'Name',
        roleLine: 'Role · Company',
        variant: 'lime',
      }
    case 'process':
      return {
        id,
        blockType: 'process',
        sectionTitle: 'How it works',
        intro: 'Optional intro.',
        steps: [
          { badge: '01', title: 'Step one', body: 'Details.', id: newId() },
          { badge: '02', title: 'Step two', body: 'Details.', id: newId() },
        ],
      }
    case 'form':
      return {
        id,
        blockType: 'form',
        formConfig: null,
        width: 'default',
      }
    case 'booking':
      return {
        id,
        blockType: 'booking',
        bookingProfile: null,
        width: 'default',
      }
    case 'testimonialSlider':
      return {
        id,
        blockType: 'testimonialSlider',
        testimonials: [],
      }
    case 'pricing':
      return {
        id,
        blockType: 'pricing',
        sectionTitle: 'Pricing',
        intro: '',
        plans: [
          {
            id: newId(),
            name: 'Starter',
            price: '$499',
            cadence: 'monthly',
            highlighted: false,
            description: 'For teams getting started.',
            bullets: [{ text: 'Feature one', id: newId() }],
            ctaLabel: 'Get started',
            ctaHref: '/contact',
          },
          {
            id: newId(),
            name: 'Growth',
            price: '$999',
            cadence: 'monthly',
            highlighted: true,
            description: 'For scaling teams.',
            bullets: [{ text: 'Everything in Starter', id: newId() }, { text: 'Plus more', id: newId() }],
            ctaLabel: 'Get started',
            ctaHref: '/contact',
          },
        ],
        footnote: '',
      }
    case 'comparison':
      return {
        id,
        blockType: 'comparison',
        sectionTitle: 'Compare plans',
        intro: '',
        columns: [
          { heading: 'Us', id: newId() },
          { heading: 'Competitor', id: newId() },
        ],
        rows: [
          { label: 'Feature A', cells: [{ value: '✓', id: newId() }, { value: '—', id: newId() }], id: newId() },
          { label: 'Feature B', cells: [{ value: '✓', id: newId() }, { value: '✓', id: newId() }], id: newId() },
        ],
      }
    case 'teamGrid':
      return {
        id,
        blockType: 'teamGrid',
        sectionTitle: 'Our team',
        intro: '',
        members: [],
      }
    case 'caseStudyGrid':
      return {
        id,
        blockType: 'caseStudyGrid',
        sectionTitle: 'Case studies',
        studies: [],
      }
    case 'rich':
      return {
        id,
        blockType: 'rich',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Edit this rich text block.', version: 1, format: 0, mode: 'normal', style: '', detail: 0 }],
                direction: 'ltr',
                format: '',
                indent: 0,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      }
    case 'spacer':
      return {
        id,
        blockType: 'spacer',
        height: 'md',
      }
    default:
      return { id, blockType: 'cta', label: 'CTA', href: '/', variant: 'primary' }
  }
}
