import type { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsPages } from '@/db/schema'

export const metadata: Metadata = {
  title: 'News / Blog',
}

export default async function ConsoleNewsListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsPages.id,
            slug: cmsPages.slug,
            title: cmsPages.title,
            status: cmsPages.status,
            updatedAt: cmsPages.updatedAt,
          })
          .from(cmsPages)
          .where(eq(cmsPages.pageType, 'resource'))
          .orderBy(desc(cmsPages.updatedAt))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">News / Blog</h1>
      <p className="tma-console-lead">
        News and blog articles are stored as <code>resource</code> pages so they stay compatible
        with the existing page builder and <code>resourceFeed</code> sections.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/news/new" className="tma-console-submit">
          New article
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No news articles yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Slug</th>
                <th scope="col">Title</th>
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
                    <code>{row.slug}</code>
                  </td>
                  <td>
                    <Link href={`/console/pages/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                      {row.title}
                    </Link>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <time dateTime={row.updatedAt.toISOString()}>
                      {row.updatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </td>
                  <td className="tma-console-table-actions">
                    <Link href={`/console/pages/${row.id}`}>Edit</Link>
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
