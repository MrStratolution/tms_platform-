import type { Metadata } from 'next'
import { desc } from 'drizzle-orm'

import { adminUsers, getCustomDb } from '@/db'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { requireConsoleTeamAdminRoute } from '@/lib/console/routeGuards'

export const metadata: Metadata = {
  title: 'Team',
}

export default async function ConsoleTeamPage() {
  const session = await requireConsoleSession()
  requireConsoleTeamAdminRoute(session)
  const db = getCustomDb()

  const members =
    db != null
      ? await db
          .select({
            id: adminUsers.id,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            createdAt: adminUsers.createdAt,
          })
          .from(adminUsers)
          .orderBy(desc(adminUsers.createdAt))
      : null

  return (
    <main className="tma-console-main wide">
        <h1 className="tma-console-page-title">Team</h1>
        {members === null ? (
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            Database is not configured. Set <code>DATABASE_URL</code> to load team
            members.
          </p>
        ) : members.length === 0 ? (
          <p className="tma-console-lead">No console admins yet.</p>
        ) : (
          <div className="tma-console-table-wrap">
            <table className="tma-console-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Email</th>
                  <th scope="col">Display name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {members.map((row) => (
                  <tr key={row.id}>
                    <td className="tma-console-table-id">{row.id}</td>
                    <td>{row.email}</td>
                    <td>{row.displayName ?? '—'}</td>
                    <td>{row.role}</td>
                    <td>
                      <time dateTime={row.createdAt.toISOString()}>
                        {row.createdAt.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
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
