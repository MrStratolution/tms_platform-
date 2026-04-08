import { asc } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'

import { getCustomDb } from '@/db/client'
import { cmsEmailTemplates } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Email templates',
}

export default async function ConsoleEmailTemplatesListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsEmailTemplates.id,
            key: cmsEmailTemplates.key,
            language: cmsEmailTemplates.language,
            subject: cmsEmailTemplates.subject,
            active: cmsEmailTemplates.active,
            updatedAt: cmsEmailTemplates.updatedAt,
          })
          .from(cmsEmailTemplates)
          .orderBy(asc(cmsEmailTemplates.key), asc(cmsEmailTemplates.language))
      : null

  return (
    <main className="tma-console-main wide">
      <div className="tma-console-actions tma-console-actions--settings-top">
        <div>
          <h1 className="tma-console-page-title">Email templates</h1>
          <p className="tma-console-lead">
            System email templates for SMTP delivery. German is the default fallback when an English template is missing.
          </p>
        </div>
        <Link href="/console/email-system/templates/new" className="tma-console-btn-secondary">
          New email template
        </Link>
      </div>

      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No email templates found.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Key</th>
                <th scope="col">Language</th>
                <th scope="col">Subject</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tma-console-table-id">{row.id}</td>
                  <td>
                    <Link
                      href={`/console/email-system/templates/${row.id}`}
                      style={{ fontWeight: 600, color: 'var(--tma-white)' }}
                    >
                      <code>{row.key}</code>
                    </Link>
                  </td>
                  <td>{String(row.language).toUpperCase()}</td>
                  <td>{row.subject}</td>
                  <td>{row.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <time dateTime={row.updatedAt.toISOString()}>
                      {row.updatedAt.toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </td>
                  <td className="tma-console-table-actions">
                    <Link href={`/console/email-system/templates/${row.id}`}>Edit</Link>
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
