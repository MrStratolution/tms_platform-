import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsFaqEntries } from '@/db/schema'

export const metadata: Metadata = {
  title: 'FAQ entries',
}

export default async function ConsoleFaqEntriesListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsFaqEntries.id,
            question: cmsFaqEntries.question,
            active: cmsFaqEntries.active,
            sortOrder: cmsFaqEntries.sortOrder,
            updatedAt: cmsFaqEntries.updatedAt,
          })
          .from(cmsFaqEntries)
          .orderBy(asc(cmsFaqEntries.sortOrder), asc(cmsFaqEntries.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">FAQ entries</h1>
      <p className="tma-console-lead">
        Reusable Q&amp;A for FAQ blocks via <code>faqEntryIds</code> (<code>tma_custom.cms_faq_entry</code>).
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/faq-entries/new" className="tma-console-submit">
          New FAQ entry
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No rows yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Sort</th>
                <th scope="col">Question</th>
                <th scope="col">Active</th>
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
                  <td>{row.sortOrder}</td>
                  <td>
                    <Link
                      href={`/console/faq-entries/${row.id}`}
                      style={{ fontWeight: 600, color: 'var(--tma-white)' }}
                    >
                      {row.question.length > 70 ? `${row.question.slice(0, 70)}…` : row.question}
                    </Link>
                  </td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td>
                    <time dateTime={row.updatedAt.toISOString()}>
                      {row.updatedAt.toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </td>
                  <td className="tma-console-table-actions">
                    <Link href={`/console/faq-entries/${row.id}`}>Edit</Link>
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
