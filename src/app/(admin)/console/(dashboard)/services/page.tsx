import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsServices } from '@/db/schema'

export const metadata: Metadata = { title: 'Services' }

export default async function ConsoleServicesPage() {
  const db = getCustomDb()
  const rows = db != null
    ? await db
        .select({
          id: cmsServices.id,
          name: cmsServices.name,
          slug: cmsServices.slug,
          active: cmsServices.active,
          updatedAt: cmsServices.updatedAt,
        })
        .from(cmsServices)
        .orderBy(asc(cmsServices.name))
    : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Services</h1>
      <p className="tma-console-lead">
        Reusable service directory for library-backed services sections, leads, and product attribution.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/services/new" className="tma-console-submit">New service</Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">Database is not configured.</p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No services yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead><tr><th>ID</th><th>Name</th><th>Slug</th><th>Active</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tma-console-table-id">{row.id}</td>
                  <td><Link href={`/console/services/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>{row.name}</Link></td>
                  <td><code>{row.slug}</code></td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td><time dateTime={row.updatedAt.toISOString()}>{row.updatedAt.toLocaleString()}</time></td>
                  <td className="tma-console-table-actions"><Link href={`/console/services/${row.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
