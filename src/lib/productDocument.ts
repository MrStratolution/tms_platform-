type JsonRecord = Record<string, unknown>

export type ProductFaqItem = { id?: string; question: string; answer: string }
export type ProductPlanBullet = { id?: string; text: string }
export type ProductPricingPlan = {
  id?: string
  name: string
  price: string
  cadence?: string | null
  description?: string | null
  bullets?: ProductPlanBullet[] | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

export type ProductGalleryItem = {
  id?: string
  mediaMode: 'image' | 'video'
  imageUrl?: string | null
  imageAlt?: string | null
  videoUrl?: string | null
  posterUrl?: string | null
  caption?: string | null
}

export type ProductVideoShowcase = {
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  sourceType?: 'upload' | 'external' | null
  uploadedVideoUrl?: string | null
  externalUrl?: string | null
  posterUrl?: string | null
  caption?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
  autoplay?: boolean | null
  muted?: boolean | null
  loop?: boolean | null
  controls?: boolean | null
  aspectRatio?: '16:9' | '4:5' | '1:1' | null
}

export type ProductDocument = {
  projectType?: string | null
  summary?: string | null
  tagline?: string | null
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  heroMediaMode?: 'image' | 'video' | null
  heroVideoUrl?: string | null
  heroVideoPosterUrl?: string | null
  heroVideoCaption?: string | null
  modules?: { id?: string; title: string; body?: string | null }[] | null
  deliverables?: { id?: string; title?: string | null; description?: string | null }[] | null
  primaryCta?: { label?: string | null; href?: string | null } | null
  galleryTitle?: string | null
  galleryIntro?: string | null
  galleryItems?: ProductGalleryItem[] | null
  videoShowcase?: ProductVideoShowcase | null
  faqs?: ProductFaqItem[] | null
  pricing?: {
    sectionTitle?: string | null
    intro?: string | null
    plans?: ProductPricingPlan[] | null
  } | null
  seo?: {
    title?: string | null
    description?: string | null
  } | null
  toggles?: {
    showBookingCta?: boolean | null
    showLeadForm?: boolean | null
    showStickyCta?: boolean | null
    showComparison?: boolean | null
    showTimeline?: boolean | null
    showTestimonials?: boolean | null
    showDownloads?: boolean | null
  } | null
  localizations?: Record<string, JsonRecord> | null
}

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function asProductDocument(value: unknown): ProductDocument {
  if (!isRecord(value)) return {}
  return value as ProductDocument
}

export function productVideoOptions(showcase: ProductVideoShowcase | null | undefined) {
  const autoplay = showcase?.autoplay === true
  const muted = autoplay ? true : showcase?.muted !== false
  return {
    autoplay,
    muted,
    loop: showcase?.loop === true,
    controls: showcase?.controls !== false,
  }
}

export function productAspectRatioClass(ratio: ProductVideoShowcase['aspectRatio']): string {
  if (ratio === '4:5') return 'tma-product-public__media--portrait'
  if (ratio === '1:1') return 'tma-product-public__media--square'
  return 'tma-product-public__media--landscape'
}
