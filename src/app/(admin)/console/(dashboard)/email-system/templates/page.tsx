import type { Metadata } from 'next'
import Link from 'next/link'

import { getCustomDb } from '@/db/client'
import { listSystemEmailTemplates } from '@/lib/email/systemStore'

export const metadata: Metadata = {
  title: 'SMTP email templates',
}

export default async function ConsoleEmailSystemTemplatesPage() {
  const db = getCustomDb()
  const rows = db ? await listSystemEmailTemplates(db) : null

  return (
    <main className="tma-console-main wide">
      <div className="tma-console-actions tma-console-actions--settings-top">
        <div>
          <p className="tma-console-back">
            <Link href="/console/email-system">← SMTP email</Link>
          </p>
          <h1 className="tma-console-page-title">SMTP email templates</h1>
          <p className="tma-console-lead">
            German is the default. English templates fall back to German automatically when an EN version is missing or disabled.
          </p>
        </div>
        <Link href="/console/email-system/templates/new" className="tma-console-btn-secondary">
          New email template
        </Link>
      </div>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Language</th>
                <th scope="col">Subject</th>
                <th scope="col">Active</th>
                <th scope="col">Updated</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><code>{row.key}</code></td>
                  <td>{row.language.toUpperCase()}</td>
                  <td>{row.subject}</td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td>{new Date(row.updatedAt).toLocaleString()}</td>
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
