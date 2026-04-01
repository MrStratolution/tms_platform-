import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsFormConfigs } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Form configs',
}

export default async function ConsoleFormConfigsListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsFormConfigs.id,
            formType: cmsFormConfigs.formType,
            active: cmsFormConfigs.active,
            updatedAt: cmsFormConfigs.updatedAt,
          })
          .from(cmsFormConfigs)
          .orderBy(asc(cmsFormConfigs.formType))
      : null

  return (
    <main className="tma-console-main wide">
      <div className="tma-console-actions tma-console-actions--settings-top">
        <div>
          <h1 className="tma-console-page-title">Form configs</h1>
          <p className="tma-console-lead">
            <code>tma_custom.cms_form_config</code> — field definitions and routing for public forms.
          </p>
        </div>
        <Link href="/console/forms/new" className="tma-console-btn-secondary">
          New form config
        </Link>
      </div>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <>
          <p className="tma-console-lead">No form configs yet. Create the first one now.</p>
          <div className="tma-console-actions">
            <Link href="/console/forms/new" className="tma-console-submit">
              Create first form config
            </Link>
          </div>
        </>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Form type</th>
                <th scope="col">Active</th>
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
                    <Link href={`/console/forms/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                      <code>{row.formType}</code>
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
                    <Link href={`/console/forms/${row.id}`}>Edit</Link>
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
