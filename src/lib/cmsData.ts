import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import {
  cmsBookingProfiles,
  cmsCaseStudies,
  cmsEmailTemplates,
  cmsSmtpSettings,
  cmsFormConfigs,
  cmsIndustries,
  cmsLeads,
  cmsMedia,
  cmsPages,
  cmsServices,
} from '@/db/schema'
import { canonicalizeHeroDocument } from '@/lib/cms/canonicalHeroBlock'
import type { BookingProfile, CaseStudy, EmailTemplate, FormConfig, Media, Page } from '@/types/cms'

export type CmsDb = NonNullable<ReturnType<typeof getCustomDb>>

export function tryGetCmsDb():
  | { ok: true; db: CmsDb }
  | { ok: false } {
  if (!process.env.DATABASE_URL?.trim()) return { ok: false }
  const db = getCustomDb()
  if (!db) return { ok: false }
  return { ok: true, db }
}

export function rowToPage(row: typeof cmsPages.$inferSelect): Page {
  const rawDoc = row.document as Record<string, unknown> | null
  const doc = canonicalizeHeroDocument(
    rawDoc && typeof rawDoc === 'object' && !Array.isArray(rawDoc) ? rawDoc : {},
  ).document as Partial<Page>
  return {
    ...doc,
    id: row.id,
    slug: row.slug,
    title: row.title,
    pageType: row.pageType as Page['pageType'],
    status: row.status as Page['status'],
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  } as Page
}

export async function getDraftPageBySlug(
  db: CmsDb,
  slug: string,
): Promise<Page | null> {
  const rows = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'draft')))
    .limit(1)
  const r = rows[0]
  return r ? rowToPage(r) : null
}

export async function getPublishedPageBySlug(
  db: CmsDb,
  slug: string,
): Promise<Page | null> {
  const rows = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'published')))
    .limit(1)
  const r = rows[0]
  return r ? rowToPage(r) : null
}

export async function getPublishedHomePage(db: CmsDb): Promise<Page | null> {
  const rows = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.pageType, 'home'), eq(cmsPages.status, 'published')))
    .limit(1)
  const r = rows[0]
  return r ? rowToPage(r) : null
}

export async function getPageBySlugAnyStatus(
  db: CmsDb,
  slug: string,
): Promise<Page | null> {
  const rows = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.slug, slug))
    .limit(1)
  const r = rows[0]
  return r ? rowToPage(r) : null
}

/** Authenticated preview: any status except trashed (draft, review, published, archived). */
export async function getPreviewPageBySlug(
  db: CmsDb,
  slug: string,
): Promise<Page | null> {
  const rows = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.slug, slug))
    .limit(1)
  const r = rows[0]
  if (!r || r.status === 'trashed') return null
  return rowToPage(r)
}

export async function listPublishedPageSlugs(db: CmsDb): Promise<string[]> {
  const rows = await db
    .select({ slug: cmsPages.slug })
    .from(cmsPages)
    .where(eq(cmsPages.status, 'published'))
  return rows.map((r) => r.slug)
}

export function rowToFormConfig(
  row: typeof cmsFormConfigs.$inferSelect,
): FormConfig {
  const d = row.document as Omit<FormConfig, 'id' | 'updatedAt' | 'createdAt'>
  return {
    ...d,
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  } as FormConfig
}

export async function getActiveFormConfigByType(
  db: CmsDb,
  formType: string,
): Promise<FormConfig | null> {
  const rows = await db
    .select()
    .from(cmsFormConfigs)
    .where(
      and(eq(cmsFormConfigs.formType, formType), eq(cmsFormConfigs.active, true)),
    )
    .limit(1)
  const r = rows[0]
  return r ? rowToFormConfig(r) : null
}

export function rowToBookingProfile(
  row: typeof cmsBookingProfiles.$inferSelect,
): BookingProfile {
  const d = row.document as Omit<
    BookingProfile,
    'id' | 'updatedAt' | 'createdAt'
  >
  return {
    ...d,
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  } as BookingProfile
}

export async function getActiveBookingProfileById(
  db: CmsDb,
  id: number,
): Promise<BookingProfile | null> {
  const rows = await db
    .select()
    .from(cmsBookingProfiles)
    .where(
      and(eq(cmsBookingProfiles.id, id), eq(cmsBookingProfiles.active, true)),
    )
    .limit(1)
  const r = rows[0]
  return r ? rowToBookingProfile(r) : null
}

export async function getBookingProfileByPublicKey(
  db: CmsDb,
  key: string,
): Promise<BookingProfile | null> {
  const trimmed = key.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    const id = Number.parseInt(trimmed, 10)
    const rows = await db
      .select()
      .from(cmsBookingProfiles)
      .where(and(eq(cmsBookingProfiles.id, id), eq(cmsBookingProfiles.active, true)))
      .limit(1)
    const r = rows[0]
    return r ? rowToBookingProfile(r) : null
  }

  const rows = await db
    .select()
    .from(cmsBookingProfiles)
    .where(
      and(
        eq(cmsBookingProfiles.internalSlug, trimmed),
        eq(cmsBookingProfiles.active, true),
      ),
    )
    .limit(1)
  const r = rows[0]
  return r ? rowToBookingProfile(r) : null
}

export async function getServiceIdBySlug(
  db: CmsDb,
  slug: string,
): Promise<number | undefined> {
  const rows = await db
    .select({ id: cmsServices.id })
    .from(cmsServices)
    .where(eq(cmsServices.slug, slug))
    .limit(1)
  return rows[0]?.id
}

export async function getIndustryIdBySlug(
  db: CmsDb,
  slug: string,
): Promise<number | undefined> {
  const rows = await db
    .select({ id: cmsIndustries.id })
    .from(cmsIndustries)
    .where(eq(cmsIndustries.slug, slug))
    .limit(1)
  return rows[0]?.id
}

export async function findLeadByIdempotencyKey(
  db: CmsDb,
  key: string,
): Promise<{ id: number } | null> {
  const rows = await db
    .select({ id: cmsLeads.id })
    .from(cmsLeads)
    .where(eq(cmsLeads.idempotencyKey, key))
    .limit(1)
  return rows[0] ?? null
}

export async function findRecentDuplicateLead(
  db: CmsDb,
  params: {
    email: string
    formType: string
    sourcePageSlug?: string | null
    since: Date
  },
): Promise<{ id: number } | null> {
  const normEmail = params.email.trim().toLowerCase()
  const sourcePageClause = params.sourcePageSlug?.trim()
    ? eq(cmsLeads.sourcePageSlug, params.sourcePageSlug.trim())
    : isNull(cmsLeads.sourcePageSlug)

  const rows = await db
    .select({ id: cmsLeads.id })
    .from(cmsLeads)
    .where(
      and(
        sql`LOWER(TRIM(${cmsLeads.email})) = ${normEmail}`,
        eq(cmsLeads.formType, params.formType),
        sourcePageClause,
        gte(cmsLeads.createdAt, params.since),
      ),
    )
    .orderBy(desc(cmsLeads.createdAt))
    .limit(1)

  return rows[0] ?? null
}

export async function findLatestLeadIdByEmailInsensitive(
  db: CmsDb,
  email: string,
): Promise<number | null> {
  const norm = email.trim().toLowerCase()
  const rows = await db
    .select({ id: cmsLeads.id })
    .from(cmsLeads)
    .where(sql`LOWER(TRIM(${cmsLeads.email})) = ${norm}`)
    .orderBy(desc(cmsLeads.createdAt))
    .limit(1)
  return rows[0]?.id ?? null
}

export async function getEmailTemplateBySlug(
  db: CmsDb,
  slug: string,
): Promise<EmailTemplate | null> {
  const rows = await db
    .select()
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.key, slug))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    key: r.key,
    language: r.language === 'en' ? 'en' : 'de',
    subject: r.subject,
    htmlBody: r.htmlBody,
    variablesJson: r.variablesJson as EmailTemplate['variablesJson'],
    active: r.active,
    name: `${r.key} (${String(r.language).toUpperCase()})`,
    slug: r.key,
    body: r.htmlBody,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}

export async function getEmailTemplateById(
  db: CmsDb,
  id: number,
): Promise<EmailTemplate | null> {
  const rows = await db
    .select()
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.id, id))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    key: r.key,
    language: r.language === 'en' ? 'en' : 'de',
    subject: r.subject,
    htmlBody: r.htmlBody,
    variablesJson: r.variablesJson as EmailTemplate['variablesJson'],
    active: r.active,
    name: `${r.key} (${String(r.language).toUpperCase()})`,
    slug: r.key,
    body: r.htmlBody,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}

export async function getEmailTemplateByKeyAndLanguage(
  db: CmsDb,
  key: string,
  language: string,
): Promise<EmailTemplate | null> {
  const normalizedLanguage = language?.toLowerCase().startsWith('en') ? 'en' : 'de'
  const rows = await db
    .select()
    .from(cmsEmailTemplates)
    .where(
      and(
        eq(cmsEmailTemplates.key, key),
        eq(cmsEmailTemplates.language, normalizedLanguage),
        eq(cmsEmailTemplates.active, true),
      ),
    )
    .limit(1)

  if (rows[0]) {
    const row = rows[0]
    return {
      id: row.id,
      key: row.key,
      language: row.language === 'en' ? 'en' : 'de',
      subject: row.subject,
      htmlBody: row.htmlBody,
      variablesJson: row.variablesJson as EmailTemplate['variablesJson'],
      active: row.active,
      name: `${row.key} (${String(row.language).toUpperCase()})`,
      slug: row.key,
      body: row.htmlBody,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }
  }

  if (normalizedLanguage !== 'de') {
    return getEmailTemplateByKeyAndLanguage(db, key, 'de')
  }

  return null
}

export type ActiveSmtpSettings = {
  id: number
  host: string
  port: number
  secure: boolean
  username: string
  passwordEncrypted: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  active: boolean
}

export async function getActiveSmtpSettings(
  db: CmsDb,
): Promise<ActiveSmtpSettings | null> {
  const rows = await db
    .select()
    .from(cmsSmtpSettings)
    .where(eq(cmsSmtpSettings.active, true))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    passwordEncrypted: row.passwordEncrypted,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo ?? null,
    active: row.active,
  }
}

/** Fetch active case studies with their featured image, ordered by id desc. */
export async function getActiveCaseStudies(
  db: CmsDb,
  limit = 6,
): Promise<CaseStudy[]> {
  const rows = await db
    .select({
      id: cmsCaseStudies.id,
      title: cmsCaseStudies.title,
      slug: cmsCaseStudies.slug,
      summary: cmsCaseStudies.summary,
      industryId: cmsCaseStudies.industryId,
      featuredImageId: cmsCaseStudies.featuredImageId,
      active: cmsCaseStudies.active,
      createdAt: cmsCaseStudies.createdAt,
      updatedAt: cmsCaseStudies.updatedAt,
      // joined media
      mediaId: cmsMedia.id,
      mediaUrl: cmsMedia.storageKey,
      mediaAlt: cmsMedia.alt,
      mediaMime: cmsMedia.mimeType,
    })
    .from(cmsCaseStudies)
    .leftJoin(cmsMedia, eq(cmsCaseStudies.featuredImageId, cmsMedia.id))
    .where(eq(cmsCaseStudies.active, true))
    .orderBy(desc(cmsCaseStudies.id))
    .limit(limit)

  return rows.map((r): CaseStudy => {
    const featuredImage: Media | null = r.mediaId
      ? {
          id: r.mediaId,
          url: r.mediaUrl ?? null,
          alt: r.mediaAlt ?? '',
          mimeType: r.mediaMime ?? null,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }
      : null
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary ?? null,
      industry: r.industryId ?? null,
      featuredImage: featuredImage ?? r.featuredImageId ?? null,
      active: r.active,
      updatedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }
  })
}

export async function getActiveCaseStudyBySlug(
  db: CmsDb,
  slug: string,
): Promise<CaseStudy | null> {
  const rows = await db
    .select({
      id: cmsCaseStudies.id,
      title: cmsCaseStudies.title,
      slug: cmsCaseStudies.slug,
      summary: cmsCaseStudies.summary,
      industryId: cmsCaseStudies.industryId,
      featuredImageId: cmsCaseStudies.featuredImageId,
      active: cmsCaseStudies.active,
      createdAt: cmsCaseStudies.createdAt,
      updatedAt: cmsCaseStudies.updatedAt,
      mediaId: cmsMedia.id,
      mediaUrl: cmsMedia.storageKey,
      mediaAlt: cmsMedia.alt,
      mediaMime: cmsMedia.mimeType,
    })
    .from(cmsCaseStudies)
    .leftJoin(cmsMedia, eq(cmsCaseStudies.featuredImageId, cmsMedia.id))
    .where(and(eq(cmsCaseStudies.slug, slug), eq(cmsCaseStudies.active, true)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const featuredImage: Media | null = row.mediaId
    ? {
        id: row.mediaId,
        url: row.mediaUrl ?? null,
        alt: row.mediaAlt ?? '',
        mimeType: row.mediaMime ?? null,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }
    : null

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    industry: row.industryId ?? null,
    featuredImage: featuredImage ?? row.featuredImageId ?? null,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}
