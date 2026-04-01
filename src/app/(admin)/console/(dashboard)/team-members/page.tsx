import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import { cmsTeamMembers } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Team Members',
}

export default async function ConsoleTeamMembersListPage() {
  const db = getCustomDb()

  const rows =
    db != null
      ? await db
          .select({
            id: cmsTeamMembers.id,
            name: cmsTeamMembers.name,
            role: cmsTeamMembers.role,
            sortOrder: cmsTeamMembers.sortOrder,
            active: cmsTeamMembers.active,
            updatedAt: cmsTeamMembers.updatedAt,
          })
          .from(cmsTeamMembers)
          .orderBy(asc(cmsTeamMembers.sortOrder), asc(cmsTeamMembers.id))
      : null

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Team Members</h1>
      <p className="tma-console-lead">
        Public team profiles for <code>teamGrid</code> layout blocks. Members are sorted by sort order on the public site.
      </p>
      <p className="tma-console-actions" style={{ marginBottom: '1.5rem' }}>
        <Link href="/console/team-members/new" className="tma-console-submit">
          New team member
        </Link>
      </p>
      {rows === null ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured. Set <code>DATABASE_URL</code>.
        </p>
      ) : rows.length === 0 ? (
        <p className="tma-console-lead">No team members yet.</p>
      ) : (
        <div className="tma-console-table-wrap">
          <table className="tma-console-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Order</th>
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
                    <Link href={`/console/team-members/${row.id}`} style={{ fontWeight: 600, color: 'var(--tma-white)' }}>
                      {row.name}
                    </Link>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.sortOrder}</td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td>
                    <time dateTime={row.updatedAt.toISOString()}>
                      {row.updatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </td>
                  <td className="tma-console-table-actions">
                    <Link href={`/console/team-members/${row.id}`}>Edit</Link>
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
