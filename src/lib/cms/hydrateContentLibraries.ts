import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { cmsCaseStudies, cmsDownloadAssets, cmsFaqEntries, cmsIndustries, cmsMedia, cmsPages, cmsProducts, cmsServices, cmsTeamMembers, cmsTestimonials } from '@/db/schema'
import { canonicalizeHeroDocument } from '@/lib/cms/canonicalHeroBlock'
import { normalizeIndustryMessaging, normalizeServiceProof } from '@/lib/contentLibraryShapes'
import { resolveCaseStudyGridSelectionMode, resolveCaseStudyGridStudies } from '@/lib/caseStudyGrid'
import { rowToPage, type CmsDb } from '@/lib/cmsData'
import { resolveLocalizedDocument } from '@/lib/documentLocalization'
import { resolveProductFeedProducts, resolveProductFeedSelectionMode } from '@/lib/productFeeds'
import type { CaseStudy, Industry, Media, Page, Product, TeamMember, Testimonial } from '@/types/cms'

function mediaRowToShape(r: typeof cmsMedia.$inferSelect): Media {
  const url = r.storageKey.startsWith('http')
    ? r.storageKey
    : `/${r.storageKey.replace(/^\//, '')}`
  const t = r.createdAt.toISOString()
  return {
    id: r.id,
    alt: r.alt ?? '',
    url,
    filename: r.filename,
    mimeType: r.mimeType ?? undefined,
    filesize: r.byteSize ?? undefined,
    updatedAt: t,
    createdAt: t,
  }
}

function rowToTestimonial(
  r: typeof cmsTestimonials.$inferSelect,
  photo: Media | null,
  logo: Media | null,
): Testimonial {
  return {
    id: r.id,
    quote: r.quote,
    author: r.author,
    role: r.role,
    company: r.company,
    photo: photo ?? undefined,
    logo: logo ?? undefined,
    active: r.active,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}

/**
 * Resolve library ids in layout blocks into embedded objects for public render.
 * - `testimonialSlider.testimonials`: numeric ids → `Testimonial`
 * - `faq.faqEntryIds`: ordered ids → `items` (library mode; overrides inline `items` when non-empty)
 * - `download.downloadAssetId`: fills title, description, fileUrl, fileLabel from `cms_download_asset`
 */
export async function hydrateLayoutContentLibraries(
  db: CmsDb,
  layout: NonNullable<Page['layout']>,
  locale?: string | null,
): Promise<Page['layout']> {
  if (!layout?.length) return layout

  const testimonialIds = new Set<number>()
  const faqIds = new Set<number>()
  const downloadIds = new Set<number>()
  const teamMemberIds = new Set<number>()
  const caseStudyIds = new Set<number>()
  const resourcePageIds = new Set<number>()
  const productIds = new Set<number>()
  const serviceIds = new Set<number>()
  const industryLibraryIds = new Set<number>()
  let fetchAllTeamMembers = false
  let fetchAllCaseStudies = false
  let fetchAllResourcePages = false
  let fetchAllProducts = false
  let fetchAllServices = false
  let fetchAllIndustries = false

  for (const block of layout) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue
    const b = block as unknown as Record<string, unknown>
    if (b.blockType === 'testimonialSlider' && Array.isArray(b.testimonials)) {
      for (const x of b.testimonials) {
        if (typeof x === 'number' && Number.isFinite(x)) testimonialIds.add(x)
      }
    }
    if (b.blockType === 'faq' && Array.isArray(b.faqEntryIds)) {
      for (const x of b.faqEntryIds) {
        if (typeof x === 'number' && Number.isFinite(x)) faqIds.add(x)
      }
    }
    if (
      b.blockType === 'download' &&
      typeof b.downloadAssetId === 'number' &&
      Number.isFinite(b.downloadAssetId)
    ) {
      downloadIds.add(b.downloadAssetId)
    }
    if (b.blockType === 'teamGrid' && Array.isArray(b.members)) {
      if (b.members.length === 0) {
        fetchAllTeamMembers = true
      } else {
        for (const x of b.members) {
          if (typeof x === 'number' && Number.isFinite(x)) teamMemberIds.add(x)
        }
      }
    }
    if (b.blockType === 'caseStudyGrid' && Array.isArray(b.studies)) {
      const selectionMode = resolveCaseStudyGridSelectionMode(
        b as unknown as Extract<NonNullable<Page['layout']>[number], { blockType: 'caseStudyGrid' }>,
      )
      if (selectionMode === 'automatic') {
        fetchAllCaseStudies = true
      } else {
        for (const x of b.studies) {
          if (typeof x === 'number' && Number.isFinite(x)) caseStudyIds.add(x)
        }
      }
    }
    if (b.blockType === 'resourceFeed') {
      if (typeof b.featuredPage === 'number' && Number.isFinite(b.featuredPage)) {
        resourcePageIds.add(b.featuredPage)
      }
      if (Array.isArray(b.pages)) {
        if (b.pages.length === 0 && b.showAllPublished !== false) {
          fetchAllResourcePages = true
        } else {
          for (const x of b.pages) {
            if (typeof x === 'number' && Number.isFinite(x)) resourcePageIds.add(x)
          }
        }
      } else if (b.showAllPublished !== false) {
        fetchAllResourcePages = true
      }
    }
    if (b.blockType === 'productFeed') {
      const selectionMode = resolveProductFeedSelectionMode(
        b as unknown as Extract<NonNullable<Page['layout']>[number], { blockType: 'productFeed' }>,
      )
      if (typeof b.featuredProduct === 'number' && Number.isFinite(b.featuredProduct)) {
        productIds.add(b.featuredProduct)
      }
      if (Array.isArray(b.products)) {
        for (const x of b.products) {
          if (typeof x === 'number' && Number.isFinite(x)) productIds.add(x)
        }
      }
      if (selectionMode !== 'manual') {
        fetchAllProducts = true
      }
    }
    if (b.blockType === 'servicesFocus' && b.sourceMode === 'library') {
      if (b.selectionMode === 'manual' && Array.isArray(b.serviceIds) && b.serviceIds.length > 0) {
        for (const x of b.serviceIds) {
          if (typeof x === 'number' && Number.isFinite(x)) serviceIds.add(x)
        }
      } else {
        fetchAllServices = true
      }
    }
    if (b.blockType === 'industryGrid') {
      if (b.selectionMode === 'manual' && Array.isArray(b.industries) && b.industries.length > 0) {
        for (const x of b.industries) {
          if (typeof x === 'number' && Number.isFinite(x)) industryLibraryIds.add(x)
        }
      } else {
        fetchAllIndustries = true
      }
    }
  }

  const [tRows, fRows, dRows, tmRows, csRows, pageRows, productRows, serviceRows] = await Promise.all([
    testimonialIds.size
      ? db.select().from(cmsTestimonials).where(inArray(cmsTestimonials.id, [...testimonialIds]))
      : Promise.resolve([] as (typeof cmsTestimonials.$inferSelect)[]),
    faqIds.size
      ? db.select().from(cmsFaqEntries).where(inArray(cmsFaqEntries.id, [...faqIds]))
      : Promise.resolve([] as (typeof cmsFaqEntries.$inferSelect)[]),
    downloadIds.size
      ? db.select().from(cmsDownloadAssets).where(inArray(cmsDownloadAssets.id, [...downloadIds]))
      : Promise.resolve([] as (typeof cmsDownloadAssets.$inferSelect)[]),
    fetchAllTeamMembers || teamMemberIds.size
      ? db.select().from(cmsTeamMembers).where(fetchAllTeamMembers ? eq(cmsTeamMembers.active, true) : inArray(cmsTeamMembers.id, [...teamMemberIds]))
      : Promise.resolve([] as (typeof cmsTeamMembers.$inferSelect)[]),
    fetchAllCaseStudies || caseStudyIds.size
      ? db.select().from(cmsCaseStudies).where(fetchAllCaseStudies ? eq(cmsCaseStudies.active, true) : inArray(cmsCaseStudies.id, [...caseStudyIds]))
      : Promise.resolve([] as (typeof cmsCaseStudies.$inferSelect)[]),
    fetchAllResourcePages || resourcePageIds.size
      ? db
          .select()
          .from(cmsPages)
          .where(
            fetchAllResourcePages
              ? and(eq(cmsPages.pageType, 'resource'), eq(cmsPages.status, 'published'))
              : and(
                  inArray(cmsPages.id, [...resourcePageIds]),
                  eq(cmsPages.pageType, 'resource'),
                  eq(cmsPages.status, 'published'),
                ),
          )
          .orderBy(desc(cmsPages.createdAt))
      : Promise.resolve([] as (typeof cmsPages.$inferSelect)[]),
    fetchAllProducts || productIds.size
      ? db
          .select()
          .from(cmsProducts)
          .where(
            fetchAllProducts
              ? eq(cmsProducts.status, 'published')
              : and(inArray(cmsProducts.id, [...productIds]), eq(cmsProducts.status, 'published')),
          )
          .orderBy(desc(cmsProducts.updatedAt))
      : Promise.resolve([] as (typeof cmsProducts.$inferSelect)[]),
    fetchAllServices || serviceIds.size
      ? db
          .select()
          .from(cmsServices)
          .where(
            fetchAllServices
              ? eq(cmsServices.active, true)
              : inArray(cmsServices.id, [...serviceIds]),
          )
          .orderBy(asc(cmsServices.name))
      : Promise.resolve([] as (typeof cmsServices.$inferSelect)[]),
  ])

  const tMap = new Map(tRows.map((r) => [r.id, r]))
  const fMap = new Map(fRows.map((r) => [r.id, r]))
  const dMap = new Map(dRows.map((r) => [r.id, r]))
  const tmMap = new Map(tmRows.map((r) => [r.id, r]))
  const csMap = new Map(csRows.map((r) => [r.id, r]))
  const pageMap = new Map(
    pageRows.map((r) => {
      const base = rowToPage(r)
      if (!locale || locale.toLowerCase() === 'de') return [r.id, base] as const
      const localized = canonicalizeHeroDocument(
        resolveLocalizedDocument(base as unknown as Record<string, unknown>, locale),
        { preferLegacyValuesForExistingHero: true },
      ).document as unknown as Page
      return [r.id, localized] as const
    }),
  )
  const productMap = new Map(
    productRows.map((r) => {
      const rawDoc =
        r.document && typeof r.document === 'object' && !Array.isArray(r.document)
          ? (r.document as Record<string, unknown>)
          : {}
      const localizedDoc =
        !locale || locale.toLowerCase() === 'de'
          ? rawDoc
          : (resolveLocalizedDocument(rawDoc, locale) as Record<string, unknown>)
      return [
        r.id,
        {
          id: r.id,
          slug: r.slug,
          name: r.name,
          status: r.status as Product['status'],
          contentKind: r.contentKind as Product['contentKind'],
          publishedAt: r.publishedAt?.toISOString() ?? null,
          listingPriority: r.listingPriority ?? null,
          showInProjectFeeds: r.showInProjectFeeds,
          document: localizedDoc,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        } satisfies Product,
      ] as const
    }),
  )

  const mediaIds = new Set<number>()
  for (const r of tRows) {
    if (r.photoMediaId != null && Number.isFinite(r.photoMediaId)) mediaIds.add(r.photoMediaId)
    if (r.logoMediaId != null && Number.isFinite(r.logoMediaId)) mediaIds.add(r.logoMediaId)
  }
  for (const r of tmRows) {
    if (r.photoMediaId != null && Number.isFinite(r.photoMediaId)) mediaIds.add(r.photoMediaId)
  }
  for (const r of csRows) {
    if (r.featuredImageId != null && Number.isFinite(r.featuredImageId)) mediaIds.add(r.featuredImageId)
  }
  for (const r of serviceRows) {
    const proof = normalizeServiceProof(r.proof)
    if (proof.imageMediaId != null && Number.isFinite(proof.imageMediaId)) mediaIds.add(proof.imageMediaId)
  }

  const industryIds = new Set<number>()
  for (const r of csRows) {
    if (r.industryId != null && Number.isFinite(r.industryId)) industryIds.add(r.industryId)
  }
  for (const id of industryLibraryIds) industryIds.add(id)

  const indRows =
    fetchAllIndustries || industryIds.size > 0
      ? await db
          .select()
          .from(cmsIndustries)
          .where(
            fetchAllIndustries
              ? eq(cmsIndustries.active, true)
              : inArray(cmsIndustries.id, [...industryIds]),
          )
          .orderBy(asc(cmsIndustries.name))
      : ([] as (typeof cmsIndustries.$inferSelect)[])

  for (const r of indRows) {
    const messaging = normalizeIndustryMessaging(r.messaging)
    if (messaging.imageMediaId != null && Number.isFinite(messaging.imageMediaId)) {
      mediaIds.add(messaging.imageMediaId)
    }
  }

  const mRows =
    mediaIds.size > 0
      ? await db.select().from(cmsMedia).where(inArray(cmsMedia.id, [...mediaIds]))
      : ([] as (typeof cmsMedia.$inferSelect)[])

  const mMap = new Map(mRows.map((r) => [r.id, mediaRowToShape(r)]))
  const indMap = new Map(indRows.map((r) => [r.id, r]))
  const serviceMap = new Map(serviceRows.map((r) => [r.id, r]))

  return layout.map((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return block
    const b = block as unknown as Record<string, unknown>

    if (b.blockType === 'testimonialSlider' && Array.isArray(b.testimonials)) {
      const next = b.testimonials.map((x) => {
        if (typeof x !== 'number' || !Number.isFinite(x)) return x
        const r = tMap.get(x)
        if (!r || !r.active) return x
        const photo =
          r.photoMediaId != null ? (mMap.get(r.photoMediaId) ?? null) : null
        const logo =
          r.logoMediaId != null ? (mMap.get(r.logoMediaId) ?? null) : null
        return rowToTestimonial(r, photo, logo)
      })
      return { ...b, testimonials: next } as typeof block
    }

    if (b.blockType === 'faq' && Array.isArray(b.faqEntryIds) && b.faqEntryIds.length > 0) {
      const ids = b.faqEntryIds.filter(
        (x): x is number => typeof x === 'number' && Number.isFinite(x),
      )
      const items = ids
        .map((id) => {
          const r = fMap.get(id)
          if (!r || !r.active) return null
          return {
            id: `faq-lib-${r.id}`,
            question: r.question,
            answer: r.answer,
          }
        })
        .filter((x): x is { id: string; question: string; answer: string } => x != null)
      return { ...b, items } as typeof block
    }

    if (
      b.blockType === 'download' &&
      typeof b.downloadAssetId === 'number' &&
      Number.isFinite(b.downloadAssetId)
    ) {
      const r = dMap.get(b.downloadAssetId)
      if (!r || !r.active) return block as typeof block
      return {
        ...b,
        title: r.title,
        description: r.description ?? '',
        fileUrl: r.fileUrl,
        fileLabel: r.fileLabel ?? b.fileLabel,
      } as typeof block
    }

    if (b.blockType === 'teamGrid' && Array.isArray(b.members)) {
      const arr = b.members
      if (arr.length === 0) {
        const allMembers = [...tmMap.values()].filter(r => r.active).map(r => {
          const photo = r.photoMediaId != null ? (mMap.get(r.photoMediaId) ?? null) : null
          return {
            id: r.id,
            name: r.name,
            role: r.role,
            bio: r.bio,
            photo: photo ?? undefined,
            sortOrder: r.sortOrder,
            linkedinUrl: r.linkedinUrl,
            active: r.active,
            updatedAt: r.updatedAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
          } satisfies TeamMember
        })
        return { ...b, members: allMembers } as typeof block
      }
      const next = arr.map((x) => {
        if (typeof x !== 'number' || !Number.isFinite(x)) return x
        const r = tmMap.get(x)
        if (!r || !r.active) return x
        const photo = r.photoMediaId != null ? (mMap.get(r.photoMediaId) ?? null) : null
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          bio: r.bio,
          photo: photo ?? undefined,
          sortOrder: r.sortOrder,
          linkedinUrl: r.linkedinUrl,
          active: r.active,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        } satisfies TeamMember
      })
      return { ...b, members: next } as typeof block
    }

    if (b.blockType === 'caseStudyGrid' && Array.isArray(b.studies)) {
      const arr = b.studies
      const manualStudies = arr.map((x) => {
        if (typeof x !== 'number' || !Number.isFinite(x)) return x
        const r = csMap.get(x)
        if (!r || !r.active) return x
        const img = r.featuredImageId != null ? (mMap.get(r.featuredImageId) ?? null) : null
        const ind = r.industryId != null ? indMap.get(r.industryId) : null
        const industry: Industry | undefined = ind ? { id: ind.id, name: ind.name, slug: ind.slug, updatedAt: ind.createdAt.toISOString(), createdAt: ind.createdAt.toISOString() } : undefined
        return {
          id: r.id,
          title: r.title,
          slug: r.slug,
          summary: r.summary,
          industry,
          featuredImage: img ?? undefined,
          active: r.active,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        } satisfies CaseStudy
      })
      const resolvedManual = manualStudies.filter(
        (study): study is CaseStudy => typeof study === 'object' && study != null && 'title' in study,
      )
      const allStudies = [...csMap.values()].map((r) => {
        const img = r.featuredImageId != null ? (mMap.get(r.featuredImageId) ?? null) : null
        const ind = r.industryId != null ? indMap.get(r.industryId) : null
        const industry: Industry | undefined = ind ? { id: ind.id, name: ind.name, slug: ind.slug, updatedAt: ind.createdAt.toISOString(), createdAt: ind.createdAt.toISOString() } : undefined
        return {
          id: r.id,
          title: r.title,
          slug: r.slug,
          summary: r.summary,
          industry,
          featuredImage: img ?? undefined,
          active: r.active,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        } satisfies CaseStudy
      })
      return {
        ...b,
        studies: resolveCaseStudyGridStudies(
          b as unknown as Extract<NonNullable<Page['layout']>[number], { blockType: 'caseStudyGrid' }>,
          resolvedManual,
          allStudies,
        ),
      } as typeof block
    }

    if (b.blockType === 'featuredProjectSpotlight') {
      const linked =
        typeof b.caseStudyId === 'number' && Number.isFinite(b.caseStudyId)
          ? csMap.get(b.caseStudyId)
          : null
      if (!linked || !linked.active) {
        return block
      }
      const img = linked.featuredImageId != null ? (mMap.get(linked.featuredImageId) ?? null) : null
      const ind = linked.industryId != null ? indMap.get(linked.industryId) : null
      const industry: Industry | undefined = ind
        ? {
            id: ind.id,
            name: ind.name,
            slug: ind.slug,
            updatedAt: ind.createdAt.toISOString(),
            createdAt: ind.createdAt.toISOString(),
          }
        : undefined
      return {
        ...b,
        caseStudyId: {
          id: linked.id,
          title: linked.title,
          slug: linked.slug,
          summary: linked.summary,
          industry,
          featuredImage: img ?? undefined,
          active: linked.active,
          updatedAt: linked.updatedAt.toISOString(),
          createdAt: linked.createdAt.toISOString(),
        } satisfies CaseStudy,
      } as typeof block
    }

    if (b.blockType === 'resourceFeed') {
      const featuredPage =
        typeof b.featuredPage === 'number' && Number.isFinite(b.featuredPage)
          ? (pageMap.get(b.featuredPage) ?? b.featuredPage)
          : b.featuredPage
      const pages =
        Array.isArray(b.pages) && b.pages.length > 0
          ? b.pages.map((x) => {
              if (typeof x !== 'number' || !Number.isFinite(x)) return x
              return pageMap.get(x) ?? x
            })
          : b.showAllPublished === false
            ? []
            : [...pageMap.values()]
      return { ...b, featuredPage, pages } as typeof block
    }

    if (b.blockType === 'productFeed') {
      const featuredProduct =
        typeof b.featuredProduct === 'number' && Number.isFinite(b.featuredProduct)
          ? (productMap.get(b.featuredProduct) ?? b.featuredProduct)
          : b.featuredProduct
      const manualProducts =
        Array.isArray(b.products)
          ? b.products.flatMap((x) => {
              if (typeof x !== 'number' || !Number.isFinite(x)) {
                return x && typeof x === 'object' && !Array.isArray(x) ? [x as Product] : []
              }
              const product = productMap.get(x)
              return product ? [product] : []
            })
          : []
      const products = resolveProductFeedProducts(
        b as unknown as Extract<NonNullable<Page['layout']>[number], { blockType: 'productFeed' }>,
        manualProducts,
        [...productMap.values()],
        locale,
      )
      return { ...b, featuredProduct, products } as typeof block
    }

    if (b.blockType === 'servicesFocus' && b.sourceMode === 'library') {
      const selectedRows =
        b.selectionMode === 'manual' && Array.isArray(b.serviceIds) && b.serviceIds.length > 0
          ? b.serviceIds.flatMap((x) => {
              if (typeof x !== 'number' || !Number.isFinite(x)) return []
              const service = serviceMap.get(x)
              return service && service.active ? [service] : []
            })
          : [...serviceMap.values()].filter((service) => service.active)

      const items = selectedRows.map((service) => {
        const proof = normalizeServiceProof(service.proof)
        const media =
          proof.imageMediaId != null && Number.isFinite(proof.imageMediaId)
            ? (mMap.get(proof.imageMediaId) ?? null)
            : null
        return {
          id: `service-${service.id}`,
          slug: service.slug,
          title: service.name,
          summary: service.summary?.trim() || service.promise?.trim() || null,
          bullets: proof.bullets ?? [],
          imageUrl: proof.imageUrl ?? media?.url ?? null,
          imageAlt: proof.imageAlt ?? media?.alt ?? service.name,
          ctaLabel: proof.ctaLabel ?? null,
          ctaHref: proof.ctaHref ?? null,
        }
      })

      return { ...b, items } as typeof block
    }

    if (b.blockType === 'industryGrid') {
      const selectedRows =
        b.selectionMode === 'manual' && Array.isArray(b.industries) && b.industries.length > 0
          ? b.industries.flatMap((x) => {
              if (typeof x !== 'number' || !Number.isFinite(x)) return []
              const industry = indMap.get(x)
              return industry && industry.active ? [industry] : []
            })
          : [...indMap.values()].filter((industry) => industry.active)

      const industries = selectedRows.map((industry) => {
        const messaging = normalizeIndustryMessaging(industry.messaging)
        const media =
          messaging.imageMediaId != null && Number.isFinite(messaging.imageMediaId)
            ? (mMap.get(messaging.imageMediaId) ?? null)
            : null
        return {
          id: industry.id,
          name: industry.name,
          slug: industry.slug,
          summary: industry.summary,
          messaging: {
            ...messaging,
            imageUrl: messaging.imageUrl ?? media?.url ?? null,
            imageAlt: messaging.imageAlt ?? media?.alt ?? industry.name,
          },
          active: industry.active,
          updatedAt: industry.updatedAt.toISOString(),
          createdAt: industry.createdAt.toISOString(),
        } satisfies Industry
      })

      return { ...b, industries } as typeof block
    }

    return block
  }) as Page['layout']
}
