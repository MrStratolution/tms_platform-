import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsIndustries } from '@/db/schema'

export const metadata: Metadata = { title: 'Industries' }

export default async function ConsoleIndustriesPage() {
  const db = getCustomDb()
  const rows = db != null
    ? await db
        .select({
          id: cmsIndustries.id,
          name: cmsIndustries.name,
          slug: cmsIndustries.slug,
          active: cmsIndustries.active,
          updatedAt: cmsIndustries.updatedAt,
        })
        .from(cmsIndustries)
        .orderBy(asc(cmsIndustries.name))
    : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Industries</h1>
      <p className="tma-console-lead">
        Reusable industry directory for positioning, routing, and library-backed industry sections.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/industries/new" className="tma-console-submit">New industry</Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">Database is not configured.</p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No industries yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead><tr><th>ID</th><th>Name</th><th>Slug</th><th>Active</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tma-console-table-id">{row.id}</td>
                  <td><Link href={`/console/industries/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>{row.name}</Link></td>
                  <td><code>{row.slug}</code></td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td><time dateTime={row.updatedAt.toISOString()}>{row.updatedAt.toLocaleString()}</time></td>
                  <td className="tma-console-table-actions"><Link href={`/console/industries/${row.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
