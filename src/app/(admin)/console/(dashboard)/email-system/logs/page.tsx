import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCustomDb } from '@/db/client'
import { consoleUserCanManageIntegrations } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { listEmailLogs } from '@/lib/email/systemStore'

export const metadata: Metadata = {
  title: 'Email logs',
}

export default async function ConsoleEmailLogsPage() {
  const session = await requireConsoleSession()
  if (!consoleUserCanManageIntegrations(session.role)) {
    redirect('/console')
  }

  const db = getCustomDb()
  const rows = db ? await listEmailLogs(db, 200) : []

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/email-system">← SMTP email</Link>
      </p>
      <h1 className="tma-console-page-title">Email logs</h1>
      <p className="tma-console-lead">
        Delivery history for SMTP test sends, lead notifications, and confirmations.
      </p>

      {!db ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No email logs yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Template</th>
                <th scope="col">Recipient</th>
                <th scope="col">Language</th>
                <th scope="col">Subject</th>
                <th scope="col">Status</th>
                <th scope="col">Sent</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tma-console-table-id">{row.id}</td>
                  <td>
                    <code>{row.templateKey}</code>
                  </td>
                  <td>{row.recipient}</td>
                  <td>{row.language.toUpperCase()}</td>
                  <td>{row.subject}</td>
                  <td>{row.status}</td>
                  <td>{row.sentAt ? new Date(row.sentAt).toLocaleString() : '—'}</td>
                  <td>{row.errorMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
