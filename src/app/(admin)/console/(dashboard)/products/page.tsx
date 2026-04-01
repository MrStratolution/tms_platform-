import type { Metadata } from 'next'
import Link from 'next/link'
import { desc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { MIGRATE_HINT, isMissingDbRelationError } from '@/lib/db/errors'

export const metadata: Metadata = {
  title: 'Products',
}

export default async function ConsoleProductsListPage() {
  const db = getCustomDb()

  type ProductListRow = {
    id: number
    slug: string
    name: string
    status: string
    updatedAt: Date
  }

  let rows: ProductListRow[] | null = null
  let migrateHint = false

  if (db != null) {
    try {
      rows = await db
        .select({
          id: cmsProducts.id,
          slug: cmsProducts.slug,
          name: cmsProducts.name,
          status: cmsProducts.status,
          updatedAt: cmsProducts.updatedAt,
        })
        .from(cmsProducts)
        .orderBy(desc(cmsProducts.updatedAt))
    } catch (e) {
      if (isMissingDbRelationError(e)) {
        migrateHint = true
        rows = []
      } else {
        throw e
      }
    }
  }

  return (
    <main className="tma-console-main wide">
        <h1 className="tma-console-page-title">Products</h1>
        <p className="tma-console-lead">
          <code>tma_custom.cms_product</code> — offers and product content (strategy §7). Published
          rows appear on <code>GET /api/products</code> and <code>/products/[slug]</code>.{' '}
          <Link href="/console/products/new" className="tma-console-inline-link">
            Create product
          </Link>
        </p>
        {rows === null ? (
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            Database is not configured. Set <code>DATABASE_URL</code>.
          </p>
        ) : migrateHint ? (
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            The <code>cms_product</code> table is missing (migrations not fully applied). {MIGRATE_HINT}
          </p>
        ) : rows.length === 0 ? (
          <p className="tma-console-lead">
            No products yet.{' '}
            <Link href="/console/products/new" className="tma-console-inline-link">
              Create a product
            </Link>{' '}
            or run <code>npm run seed</code> for a demo offer.
          </p>
        ) : (
          <div className="tma-console-table-wrap">
            <table className="tma-console-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="tma-console-table-id">
                      {row.id}
                    </td>
                    <td>
                      <code>{row.slug}</code>
                    </td>
                    <td>
                      <Link href={`/console/products/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <time dateTime={row.updatedAt.toISOString()}>
                        {row.updatedAt.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </td>
                    <td className="tma-console-table-actions">
                      <Link href={`/console/products/${row.id}`}>Edit</Link>
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
