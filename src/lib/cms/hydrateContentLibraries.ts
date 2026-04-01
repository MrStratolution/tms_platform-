import { eq, inArray } from 'drizzle-orm'

import { cmsCaseStudies, cmsDownloadAssets, cmsFaqEntries, cmsIndustries, cmsMedia, cmsTeamMembers, cmsTestimonials } from '@/db/schema'
import type { CmsDb } from '@/lib/cmsData'
import type { CaseStudy, Industry, Media, Page, TeamMember, Testimonial } from '@/types/cms'

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
): Testimonial {
  return {
    id: r.id,
    quote: r.quote,
    author: r.author,
    role: r.role,
    company: r.company,
    photo: photo ?? undefined,
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
): Promise<Page['layout']> {
  if (!layout?.length) return layout

  const testimonialIds = new Set<number>()
  const faqIds = new Set<number>()
  const downloadIds = new Set<number>()
  const teamMemberIds = new Set<number>()
  const caseStudyIds = new Set<number>()
  let fetchAllTeamMembers = false
  let fetchAllCaseStudies = false

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
      if (b.studies.length === 0) {
        fetchAllCaseStudies = true
      } else {
        for (const x of b.studies) {
          if (typeof x === 'number' && Number.isFinite(x)) caseStudyIds.add(x)
        }
      }
    }
  }

  const [tRows, fRows, dRows, tmRows, csRows] = await Promise.all([
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
  ])

  const tMap = new Map(tRows.map((r) => [r.id, r]))
  const fMap = new Map(fRows.map((r) => [r.id, r]))
  const dMap = new Map(dRows.map((r) => [r.id, r]))
  const tmMap = new Map(tmRows.map((r) => [r.id, r]))
  const csMap = new Map(csRows.map((r) => [r.id, r]))

  const mediaIds = new Set<number>()
  for (const r of tRows) {
    if (r.photoMediaId != null && Number.isFinite(r.photoMediaId)) mediaIds.add(r.photoMediaId)
  }
  for (const r of tmRows) {
    if (r.photoMediaId != null && Number.isFinite(r.photoMediaId)) mediaIds.add(r.photoMediaId)
  }
  for (const r of csRows) {
    if (r.featuredImageId != null && Number.isFinite(r.featuredImageId)) mediaIds.add(r.featuredImageId)
  }

  const industryIds = new Set<number>()
  for (const r of csRows) {
    if (r.industryId != null && Number.isFinite(r.industryId)) industryIds.add(r.industryId)
  }

  const [mRows, indRows] = await Promise.all([
    mediaIds.size > 0
      ? db.select().from(cmsMedia).where(inArray(cmsMedia.id, [...mediaIds]))
      : Promise.resolve([] as (typeof cmsMedia.$inferSelect)[]),
    industryIds.size > 0
      ? db.select().from(cmsIndustries).where(inArray(cmsIndustries.id, [...industryIds]))
      : Promise.resolve([] as (typeof cmsIndustries.$inferSelect)[]),
  ])
  const mMap = new Map(mRows.map((r) => [r.id, mediaRowToShape(r)]))
  const indMap = new Map(indRows.map((r) => [r.id, r]))

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
        return rowToTestimonial(r, photo)
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
      if (arr.length === 0) {
        const allStudies = [...csMap.values()].filter(r => r.active).map(r => {
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
        return { ...b, studies: allStudies } as typeof block
      }
      const next = arr.map((x) => {
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
      return { ...b, studies: next } as typeof block
    }

    return block
  }) as Page['layout']
}
