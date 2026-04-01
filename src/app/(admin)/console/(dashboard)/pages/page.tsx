import type { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsPages } from '@/db/schema'

import { ConsolePagesStatusFilters } from './ConsolePagesStatusFilters'

export const metadata: Metadata = {
  title: 'Pages',
}

const STATUS_PARAMS = new Set(['draft', 'review', 'published', 'archived', 'trashed'])

type PageProps = {
  searchParams?: Promise<{ status?: string | string[] }>
}

export default async function ConsolePagesListPage(props: PageProps) {
  const db = getCustomDb()
  const sp = props.searchParams ? await props.searchParams : undefined
  const raw = sp?.status
  const statusParam =
    typeof raw === 'string' && STATUS_PARAMS.has(raw) ? raw : null

  const pages =
    db != null
      ? statusParam
        ? await db
            .select({
              id: cmsPages.id,
              slug: cmsPages.slug,
              title: cmsPages.title,
              pageType: cmsPages.pageType,
              status: cmsPages.status,
              updatedAt: cmsPages.updatedAt,
            })
            .from(cmsPages)
            .where(eq(cmsPages.status, statusParam))
            .orderBy(desc(cmsPages.updatedAt))
        : await db
            .select({
              id: cmsPages.id,
              slug: cmsPages.slug,
              title: cmsPages.title,
              pageType: cmsPages.pageType,
              status: cmsPages.status,
              updatedAt: cmsPages.updatedAt,
            })
            .from(cmsPages)
            .orderBy(desc(cmsPages.updatedAt))
      : null

  return (
    <main className="tma-console-main wide">
        <h1 className="tma-console-page-title">Pages</h1>
        <p className="tma-console-lead">
          Edit site pages here. Click a <strong>title</strong> or <strong>Edit</strong> to change
          headlines, SEO, and page sections without touching code. For deep technical edits, see{' '}
          <code>docs/CONSOLE_CMS_RUNBOOK.md</code>.{' '}
          <Link href="/console/pages/new" className="tma-console-inline-link">
            Create page
          </Link>
        </p>
        {pages !== null ? <ConsolePagesStatusFilters active={statusParam} /> : null}
        {pages === null ? (
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            Database is not configured. Set <code>DATABASE_URL</code>.
          </p>
        ) : pages.length === 0 ? (
          <p className="tma-console-lead">
            {statusParam ? (
              <>No pages with status <code>{statusParam}</code>. Try another filter or clear filters.</>
            ) : (
              <>
                No pages yet. Run <code>npm run seed</code> to insert editable starter pages (home,
                services, contact, thanks). If the database is new, run{' '}
                <code>npm run db:custom:migrate</code> first.
              </>
            )}
          </p>
        ) : (
          <div className="tma-console-table-wrap">
            <table className="tma-console-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((row) => (
                  <tr key={row.id}>
                    <td className="tma-console-table-id">
                      {row.id}
                    </td>
                    <td>
                      <code>{row.slug}</code>
                    </td>
                    <td>
                      <Link href={`/console/pages/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                        {row.title}
                      </Link>
                    </td>
                    <td>{row.pageType}</td>
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
