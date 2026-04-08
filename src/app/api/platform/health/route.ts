import { and, desc, eq, gte, sql } from 'drizzle-orm'

import { getCustomDb, migrationCheckpoint } from '@/db'
import {
  cmsBookingEvents,
  cmsBookingProfiles,
  cmsCrmSyncLogs,
  cmsSmtpSettings,
} from '@/db/schema'

/**
 * Verifies the app-owned DB layer (Drizzle + `tma_custom` schema).
 */
export async function GET() {
  const db = getCustomDb()
  if (!db) {
    return Response.json({
      ok: true,
      customPlatform: 'skipped',
      reason: 'DATABASE_URL is not set',
    })
  }

  try {
    const now = new Date()
    const [checkpoint, smtpRows, upcomingBookings, crmFailures, bookingProfileRows] =
      await Promise.all([
        db.select().from(migrationCheckpoint).orderBy(desc(migrationCheckpoint.id)).limit(1),
        db
          .select({
            id: cmsSmtpSettings.id,
            active: cmsSmtpSettings.active,
          })
          .from(cmsSmtpSettings)
          .orderBy(desc(cmsSmtpSettings.updatedAt))
          .limit(1),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsBookingEvents)
          .where(
            and(
              eq(cmsBookingEvents.status, 'confirmed'),
              gte(cmsBookingEvents.scheduledFor, now),
            ),
          ),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsCrmSyncLogs)
          .where(eq(cmsCrmSyncLogs.status, 'failed')),
        db.select().from(cmsBookingProfiles),
      ])

    const activeSmtp = smtpRows[0]?.active === true
    const internalBookingProfiles = bookingProfileRows.filter((row) => {
      const doc = row.document
      return !!doc && typeof doc === 'object' && !Array.isArray(doc) && (doc as { provider?: unknown }).provider === 'internal'
    }).length

    const rateLimitBackend =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? 'upstash'
        : 'memory'

    const zohoAutoSyncEnabled = process.env.ZOHO_AUTO_SYNC === 'true'
    const zohoOAuthConfigured = Boolean(
      process.env.ZOHO_CLIENT_ID &&
        process.env.ZOHO_CLIENT_SECRET &&
        process.env.ZOHO_REFRESH_TOKEN,
    )

    const warnings: string[] = []
    if (!activeSmtp) warnings.push('smtp_inactive')
    if (rateLimitBackend !== 'upstash') warnings.push('rate_limit_memory_fallback')
    if (zohoAutoSyncEnabled && !zohoOAuthConfigured) warnings.push('zoho_auto_sync_without_oauth')

    return Response.json({
      ok: true,
      customPlatform: 'ready',
      checkpoint: checkpoint[0]?.phase ?? null,
      warnings,
      services: {
        smtp: activeSmtp ? 'ready' : smtpRows[0] ? 'inactive' : 'missing',
        rateLimit: rateLimitBackend,
        zoho:
          zohoAutoSyncEnabled && zohoOAuthConfigured
            ? 'ready'
            : zohoAutoSyncEnabled
              ? 'misconfigured'
              : 'disabled',
      },
      booking: {
        internalProfiles: internalBookingProfiles,
        upcomingConfirmedEvents: Number(upcomingBookings[0]?.value ?? 0),
      },
      crm: {
        failedSyncs: Number(crmFailures[0]?.value ?? 0),
      },
    })
  } catch {
    return Response.json(
      {
        ok: false,
        customPlatform: 'migrate_required',
        hint: 'Apply custom migrations: npm run db:custom:migrate',
      },
      { status: 503 },
    )
  }
}
