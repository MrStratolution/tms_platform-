import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsDownloadAssets } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Downloads',
}

export default async function ConsoleDownloadsListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsDownloadAssets.id,
            title: cmsDownloadAssets.title,
            fileUrl: cmsDownloadAssets.fileUrl,
            active: cmsDownloadAssets.active,
            updatedAt: cmsDownloadAssets.updatedAt,
          })
          .from(cmsDownloadAssets)
          .orderBy(asc(cmsDownloadAssets.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Download assets</h1>
      <p className="tma-console-lead">
        Reusable files for download blocks via <code>downloadAssetId</code> (
        <code>tma_custom.cms_download_asset</code>).
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/downloads/new" className="tma-console-submit">
          New download
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
                <th scope="col">Title</th>
                <th scope="col">File URL</th>
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
                  <td>
                    <Link
                      href={`/console/downloads/${row.id}`}
                      style={{ fontWeight: 600, color: 'var(--tma-white)' }}
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.85em' }}>
                      {row.fileUrl.length > 48 ? `${row.fileUrl.slice(0, 48)}…` : row.fileUrl}
                    </code>
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
                    <Link href={`/console/downloads/${row.id}`}>Edit</Link>
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
