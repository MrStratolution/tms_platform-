import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsTestimonials } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Testimonials',
}

export default async function ConsoleTestimonialsListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsTestimonials.id,
            author: cmsTestimonials.author,
            quote: cmsTestimonials.quote,
            active: cmsTestimonials.active,
            updatedAt: cmsTestimonials.updatedAt,
          })
          .from(cmsTestimonials)
          .orderBy(asc(cmsTestimonials.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Testimonials</h1>
      <p className="tma-console-lead">
        Reusable quotes for <code>testimonialSlider</code> blocks (<code>tma_custom.cms_testimonial</code>).
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/testimonials/new" className="tma-console-submit">
          New testimonial
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No rows yet. Create one or run migrations.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Author</th>
                <th scope="col">Quote</th>
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
                      href={`/console/testimonials/${row.id}`}
                      style={{ fontWeight: 600, color: 'var(--tma-white)' }}
                    >
                      {row.author}
                    </Link>
                  </td>
                  <td>{row.quote.length > 80 ? `${row.quote.slice(0, 80)}…` : row.quote}</td>
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
                    <Link href={`/console/testimonials/${row.id}`}>Edit</Link>
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
