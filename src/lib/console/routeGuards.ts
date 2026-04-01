import { redirect } from 'next/navigation'

import type { ConsoleJwtPayload } from '@/lib/console/jwt'
import { consoleUserCanAdminTeam, userHasConsolePermission } from '@/lib/console/rbac'

/** Only `admin` may open `/console/team` (user directory). */
export function requireConsoleTeamAdminRoute(session: ConsoleJwtPayload): void {
  if (!consoleUserCanAdminTeam(session.role)) {
    redirect('/console')
  }
}

/** `viewer` cannot open leads (PII); `admin`, `ops`, and `editor` can. */
export function requireConsoleLeadsRoute(session: ConsoleJwtPayload): void {
  if (!userHasConsolePermission(session.role, 'leads:read')) {
    redirect('/console')
  }
}
