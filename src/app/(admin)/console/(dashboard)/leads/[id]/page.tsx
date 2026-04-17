import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'

import { ConsoleLeadUpdateForm } from '@/components/console/ConsoleLeadUpdateForm'
import { getCustomDb } from '@/db/client'
import { adminUsers, cmsBookingEvents, cmsBookingProfiles, cmsLeads } from '@/db/schema'
import { canUseAiTools } from '@/lib/adminAiAuth'
import { consoleUserCanWriteLeads } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { requireConsoleLeadsRoute } from '@/lib/console/routeGuards'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Lead ${id}` }
}

export default async function ConsoleLeadDetailPage(props: Props) {
  const session = await requireConsoleSession()
  requireConsoleLeadsRoute(session)
  const id = Number.parseInt((await props.params).id, 10)
  if (!Number.isFinite(id) || id < 1) notFound()

  const db = getCustomDb()
  if (!db) {
    return (
      <main className="tma-console-main wide">
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      </main>
    )
  }

  const rows = await db.select().from(cmsLeads).where(eq(cmsLeads.id, id)).limit(1)
  const lead = rows[0]
  if (!lead) notFound()

  const canEditLead = consoleUserCanWriteLeads(session.role)
  const canUseAi = canUseAiTools(session)
  const adminProfileRows = await db
    .select({ whatsappNumber: adminUsers.whatsappNumber })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.sub))
    .limit(1)
  const adminWhatsappNumber = adminProfileRows[0]?.whatsappNumber ?? null
  const bookingRows = await db
    .select()
    .from(cmsBookingEvents)
    .where(eq(cmsBookingEvents.leadId, lead.id))
    .orderBy(desc(cmsBookingEvents.scheduledFor), desc(cmsBookingEvents.id))
    .limit(1)
  const bookingEvent = bookingRows[0] ?? null
  const bookingProfileRows =
    bookingEvent?.bookingProfileId != null
      ? await db
          .select({
            id: cmsBookingProfiles.id,
            document: cmsBookingProfiles.document,
          })
          .from(cmsBookingProfiles)
          .where(eq(cmsBookingProfiles.id, bookingEvent.bookingProfileId))
          .limit(1)
      : []
  const bookingProfile = bookingProfileRows[0] ?? null
  const bookingProfileDoc =
    bookingProfile?.document &&
    typeof bookingProfile.document === 'object' &&
    !Array.isArray(bookingProfile.document)
      ? (bookingProfile.document as { name?: unknown })
      : null
  const bookingProfileName =
    typeof bookingProfileDoc?.name === 'string' ? bookingProfileDoc.name : null

  const entries: [string, string][] = [
    ['ID', String(lead.id)],
    ['Email', lead.email],
    ['First name', lead.firstName ?? '—'],
    ['Last name', lead.lastName ?? '—'],
    ['Phone', lead.phone ?? '—'],
    ['Company', lead.company ?? '—'],
    ['Website', lead.website ?? '—'],
    ['Form type', lead.formType ?? '—'],
    ['Lead status', lead.leadStatus],
    ['CRM sync status', lead.crmSyncStatus],
    ['Booking status', lead.bookingStatus],
    ['Owner', lead.owner ?? '—'],
    ['Source page slug', lead.sourcePageSlug ?? '—'],
    ['Source page id', lead.sourcePageId != null ? String(lead.sourcePageId) : '—'],
    ['Service interest id', lead.serviceInterestId != null ? String(lead.serviceInterestId) : '—'],
    ['Industry id', lead.industryId != null ? String(lead.industryId) : '—'],
    ['Consent marketing', lead.consentMarketing ? 'yes' : 'no'],
    ['Idempotency key', lead.idempotencyKey ?? '—'],
    ['Notes', lead.notes ?? '—'],
    [
      'Created',
      lead.createdAt.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }),
    ],
    [
      'Updated',
      lead.updatedAt.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }),
    ],
  ]

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/leads">← All leads</Link>
      </p>
      <h1 className="tma-console-page-title">Lead #{lead.id}</h1>
      <ConsoleLeadUpdateForm
        leadId={lead.id}
        initialOwner={lead.owner}
        initialLeadStatus={lead.leadStatus}
        initialNotes={lead.notes}
        canEdit={canEditLead}
        canUseAi={canUseAi}
        adminWhatsappNumber={adminWhatsappNumber}
        bookingEvent={
          bookingEvent
            ? {
                id: bookingEvent.id,
                status: bookingEvent.status,
                scheduledFor: bookingEvent.scheduledFor?.toISOString() ?? null,
                bookingProfileName,
              }
            : null
        }
      />
      <dl className="tma-console-dl">
        {entries.map(([k, v]) => (
          <div key={k} className="tma-console-dl-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <section className="tma-console-json-block">
        <h2 className="tma-console-subheading">UTM</h2>
        <pre className="tma-console-pre">
          {lead.utm != null ? JSON.stringify(lead.utm, null, 2) : '—'}
        </pre>
      </section>
      <section className="tma-console-json-block">
        <h2 className="tma-console-subheading">Submission extras</h2>
        <pre className="tma-console-pre">
          {lead.submissionExtras != null
            ? JSON.stringify(lead.submissionExtras, null, 2)
            : '—'}
        </pre>
      </section>
    </main>
  )
}
