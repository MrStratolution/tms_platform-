import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsCaseStudies } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Case Studies',
}

export default async function ConsoleCaseStudiesListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsCaseStudies.id,
            title: cmsCaseStudies.title,
            slug: cmsCaseStudies.slug,
            active: cmsCaseStudies.active,
            updatedAt: cmsCaseStudies.updatedAt,
          })
          .from(cmsCaseStudies)
          .orderBy(asc(cmsCaseStudies.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Case Studies</h1>
      <p className="tma-console-lead">
        Case study entries for <code>caseStudyGrid</code> layout blocks.
      </p>
      <p className="tma-console-block-fields-hint">
        Active rows appear in automatic case-study sections. Deactivate any junk or draft-quality
        row that should not show publicly.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/case-studies/new" className="tma-console-submit">
          New case study
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No case studies yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Slug</th>
                <th scope="col">Active</th>
                <th scope="col">Updated</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tma-console-table-id">{row.id}</td>
                  <td>
                    <Link href={`/console/case-studies/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                      {row.title}
                    </Link>
                  </td>
                  <td><code>{row.slug}</code></td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td>
                    <time dateTime={row.updatedAt.toISOString()}>
                      {row.updatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </td>
                  <td className="tma-console-table-actions">
                    <Link href={`/console/case-studies/${row.id}`}>Edit</Link>
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
