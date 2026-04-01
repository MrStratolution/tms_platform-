import type { Metadata } from 'next'
import Link from 'next/link'
import { desc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsLeads } from '@/db/schema'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { requireConsoleLeadsRoute } from '@/lib/console/routeGuards'

export const metadata: Metadata = {
  title: 'Leads',
}

export default async function ConsoleLeadsPage() {
  const session = await requireConsoleSession()
  requireConsoleLeadsRoute(session)
  const db = getCustomDb()

  const leads =
    db != null
      ? await db
          .select({
            id: cmsLeads.id,
            email: cmsLeads.email,
            firstName: cmsLeads.firstName,
            lastName: cmsLeads.lastName,
            company: cmsLeads.company,
            formType: cmsLeads.formType,
            leadStatus: cmsLeads.leadStatus,
            crmSyncStatus: cmsLeads.crmSyncStatus,
            sourcePageSlug: cmsLeads.sourcePageSlug,
            createdAt: cmsLeads.createdAt,
          })
          .from(cmsLeads)
          .orderBy(desc(cmsLeads.createdAt))
          .limit(200)
      : null

  return (
    <main className="tma-console-main wide">
        <h1 className="tma-console-page-title">Leads</h1>
        <p className="tma-console-lead">
          Form submissions and booking-related leads from <code>tma_custom.cms_lead</code>. Showing
          the 200 most recent.
        </p>
        {leads === null ? (
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            Database is not configured. Set <code>DATABASE_URL</code>.
          </p>
        ) : leads.length === 0 ? (
          <p className="tma-console-lead">No leads yet.</p>
        ) : (
          <div className="tma-console-table-wrap">
            <table className="tma-console-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Email</th>
                  <th scope="col">Name</th>
                  <th scope="col">Company</th>
                  <th scope="col">Form</th>
                  <th scope="col">Lead status</th>
                  <th scope="col">CRM sync</th>
                  <th scope="col">Page</th>
                  <th scope="col">Created</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <tr key={row.id}>
                    <td className="tma-console-table-id">
                      {row.id}
                    </td>
                    <td>
                      <Link href={`/console/leads/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                        {row.email}
                      </Link>
                    </td>
                    <td>
                      {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td>{row.company ?? '—'}</td>
                    <td>{row.formType ?? '—'}</td>
                    <td>{row.leadStatus}</td>
                    <td>{row.crmSyncStatus}</td>
                    <td>{row.sourcePageSlug ?? '—'}</td>
                    <td>
                      <time dateTime={row.createdAt.toISOString()}>
                        {row.createdAt.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </td>
                    <td className="tma-console-table-actions">
                      <Link href={`/console/leads/${row.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </main>
  )
}
