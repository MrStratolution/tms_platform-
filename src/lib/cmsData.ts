import { and, desc, eq, sql } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import {
  cmsBookingProfiles,
  cmsEmailTemplates,
  cmsFormConfigs,
  cmsIndustries,
  cmsLeads,
  cmsPages,
  cmsServices,
} from '@/db/schema'
import type { BookingProfile, EmailTemplate, FormConfig, Page } from '@/types/cms'

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
  const doc = row.document as Partial<Page>
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
    .where(eq(cmsEmailTemplates.slug, slug))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    subject: r.subject,
    body: r.body,
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
    name: r.name,
    slug: r.slug,
    subject: r.subject,
    body: r.body,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}
