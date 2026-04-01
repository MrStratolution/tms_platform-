import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsLayoutBlocks } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Saved blocks',
}

export default async function ConsoleLayoutBlocksListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsLayoutBlocks.id,
            name: cmsLayoutBlocks.name,
            active: cmsLayoutBlocks.active,
            updatedAt: cmsLayoutBlocks.updatedAt,
          })
          .from(cmsLayoutBlocks)
          .orderBy(asc(cmsLayoutBlocks.name), asc(cmsLayoutBlocks.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Saved layout blocks</h1>
      <p className="tma-console-lead">
        Reusable single sections for pages (<code>tma_custom.cms_layout_block</code>). Insert copies from
        the page editor.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/layout-blocks/new" className="tma-console-submit">
          New saved block
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No saved blocks yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
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
                      href={`/console/layout-blocks/${row.id}`}
                      style={{ fontWeight: 600, color: 'var(--tma-white)' }}
                    >
                      {row.name}
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
                    <Link href={`/console/layout-blocks/${row.id}`}>Edit</Link>
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
