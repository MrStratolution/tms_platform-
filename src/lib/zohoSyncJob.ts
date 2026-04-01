import { eq } from 'drizzle-orm'

import { cmsCrmSyncLogs, cmsLeads } from '@/db/schema'
import { logEvent } from '@/lib/logger'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'
import type { Lead } from '@/types/cms'

import { fetchLeadById } from './cmsLeadMap'
import type { CmsDb } from './cmsData'

import { zohoGetAccessToken, zohoUpsertLead } from './zohoCrm'

function buildZohoPayload(lead: Lead): Record<string, unknown> {
  const serviceInterest =
    lead.serviceInterest == null
      ? undefined
      : typeof lead.serviceInterest === 'number'
        ? { id: lead.serviceInterest }
        : {
            id: lead.serviceInterest.id,
            slug: lead.serviceInterest.slug,
            name: lead.serviceInterest.name,
          }

  const industry =
    lead.industry == null
      ? undefined
      : typeof lead.industry === 'number'
        ? { id: lead.industry }
        : {
            id: lead.industry.id,
            slug: lead.industry.slug,
            name: lead.industry.name,
          }

  const sourcePage =
    lead.sourcePage == null
      ? undefined
      : typeof lead.sourcePage === 'number'
        ? { id: lead.sourcePage }
        : {
            id: lead.sourcePage.id,
            slug: lead.sourcePage.slug,
            title: lead.sourcePage.title,
          }

  return {
    leadId: lead.id,
    email: lead.email,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    company: lead.company,
    website: lead.website,
    formType: lead.formType,
    sourcePageSlug: lead.sourcePageSlug,
    sourcePage,
    serviceInterest,
    industry,
    utm: lead.utm,
    leadStatus: lead.leadStatus,
    bookingStatus: lead.bookingStatus,
    submissionExtras: lead.submissionExtras,
    idempotencyKey: lead.idempotencyKey,
    createdAt: lead.createdAt,
  }
}

export type ZohoSyncResult = {
  success: boolean
  skipped: boolean
  logId: number
  zohoResponse?: unknown
}

/**
 * Single-lead Zoho sync: real API when OAuth env is complete.
 * Skipped when OAuth not configured (unless ZOHO_SYNC_MOCK_FAILURE forces failure).
 */
export async function runZohoSyncForLead(
  db: CmsDb,
  leadId: number,
): Promise<ZohoSyncResult> {
  const lead = await fetchLeadById(db, leadId)

  if (!lead) {
    throw new Error('Lead not found')
  }

  const zohoPayload = buildZohoPayload(lead)
  const mockFailure = process.env.ZOHO_SYNC_MOCK_FAILURE === 'true'
  const useMockSuccess = process.env.ZOHO_USE_MOCK === 'true'

  let logStatus: 'success' | 'failed' | 'skipped' = 'skipped'
  let leadCrm: 'synced' | 'failed' | 'skipped' = 'skipped'
  let zohoResponse: unknown = { skipped: true, reason: 'zoho_oauth_not_configured' }

  if (mockFailure) {
    logStatus = 'failed'
    leadCrm = 'failed'
    zohoResponse = { mock: true, error: 'ZOHO_SYNC_MOCK_FAILURE' }
  } else if (useMockSuccess) {
    logStatus = 'success'
    leadCrm = 'synced'
    zohoResponse = { mock: true }
  } else {
    const token = await zohoGetAccessToken()
    if (token) {
      const desc = JSON.stringify(zohoPayload).slice(0, 6000)
      const api = await zohoUpsertLead(token, {
        firstName: lead.firstName ?? undefined,
        lastName: lead.lastName ?? undefined,
        email: lead.email,
        phone: lead.phone ?? undefined,
        company: lead.company ?? undefined,
        website: lead.website ?? undefined,
        description: desc,
      })
      if (api.ok) {
        logStatus = 'success'
        leadCrm = 'synced'
        zohoResponse = api.raw
      } else {
        logStatus = 'failed'
        leadCrm = 'failed'
        zohoResponse = { error: api.error, raw: api.raw }
      }
    }
  }

  const syncedAt = new Date()
  const [log] = await db
    .insert(cmsCrmSyncLogs)
    .values({
      leadId: lead.id,
      targetSystem: 'zoho',
      status: logStatus,
      payload: zohoPayload,
      response: zohoResponse as Record<string, unknown>,
      syncedAt,
    })
    .returning({ id: cmsCrmSyncLogs.id })

  await db
    .update(cmsLeads)
    .set({ crmSyncStatus: leadCrm, updatedAt: new Date() })
    .where(eq(cmsLeads.id, lead.id))

  logEvent({
    event: 'zoho_sync',
    leadId: lead.id,
    logStatus,
    logId: log.id,
  })

  return {
    success: logStatus === 'success',
    skipped: logStatus === 'skipped',
    logId: log.id,
    zohoResponse,
  }
}

export function triggerZohoAutoSync(leadId: number, correlationId: string) {
  if (process.env.ZOHO_AUTO_SYNC !== 'true') return
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return

  const url = `${getPublicSiteOrigin()}/api/integrations/zoho/sync/${leadId}`
  void fetch(url, {
    method: 'POST',
    headers: { 'x-tma-internal-secret': secret },
  })
    .then(() => {
      logEvent({ event: 'zoho_auto_sync_triggered', leadId, correlationId })
    })
    .catch((err: Error) => {
      logEvent({ event: 'zoho_auto_sync_failed', leadId, correlationId, error: err.message })
    })
}
