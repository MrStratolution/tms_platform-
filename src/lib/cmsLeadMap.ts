import { eq } from 'drizzle-orm'

import {
  cmsIndustries,
  cmsLeads,
  cmsPages,
  cmsServices,
} from '@/db/schema'
import type { Industry, Lead, Page, Service } from '@/types/cms'

import type { CmsDb } from './cmsData'

function iso(d: Date): string {
  return d.toISOString()
}

export async function fetchLeadById(db: CmsDb, id: number): Promise<Lead | null> {
  const rows = await db.select().from(cmsLeads).where(eq(cmsLeads.id, id)).limit(1)
  const row = rows[0]
  if (!row) return null

  let serviceInterest: Lead['serviceInterest']
  if (row.serviceInterestId != null) {
    const s = await db
      .select()
      .from(cmsServices)
      .where(eq(cmsServices.id, row.serviceInterestId))
      .limit(1)
    const r = s[0]
    if (r) {
      const svc: Service = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        updatedAt: iso(r.createdAt),
        createdAt: iso(r.createdAt),
      }
      serviceInterest = svc
    }
  }

  let industry: Lead['industry']
  if (row.industryId != null) {
    const s = await db
      .select()
      .from(cmsIndustries)
      .where(eq(cmsIndustries.id, row.industryId))
      .limit(1)
    const r = s[0]
    if (r) {
      const ind: Industry = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        updatedAt: iso(r.createdAt),
        createdAt: iso(r.createdAt),
      }
      industry = ind
    }
  }

  let sourcePage: Lead['sourcePage']
  if (row.sourcePageId != null) {
    const s = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.id, row.sourcePageId))
      .limit(1)
    const r = s[0]
    if (r) {
      const doc = r.document as Partial<Page>
      sourcePage = {
        id: r.id,
        slug: r.slug,
        title: r.title,
        pageType: r.pageType as Page['pageType'],
        status: r.status as Page['status'],
        ...doc,
        updatedAt: iso(r.updatedAt),
        createdAt: iso(r.createdAt),
      } as Page
    }
  }

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    website: row.website,
    serviceInterest,
    industry,
    sourcePage,
    sourcePageSlug: row.sourcePageSlug,
    utm: row.utm as Lead['utm'],
    formType: row.formType,
    bookingStatus: row.bookingStatus as Lead['bookingStatus'],
    owner: row.owner,
    leadStatus: row.leadStatus as Lead['leadStatus'],
    crmSyncStatus: row.crmSyncStatus as Lead['crmSyncStatus'],
    notes: row.notes,
    consentMarketing: row.consentMarketing,
    idempotencyKey: row.idempotencyKey,
    submissionExtras: row.submissionExtras as Lead['submissionExtras'],
    updatedAt: iso(row.updatedAt),
    createdAt: iso(row.createdAt),
  }
}
