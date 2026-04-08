import { redirect } from 'next/navigation'

import type { ConsoleJwtPayload } from '@/lib/console/jwt'
import { consoleUserCanAdminTeam, userHasConsolePermission } from '@/lib/console/rbac'

/** Only `admin` may open `/console/team` (user directory). */
export function requireConsoleTeamAdminRoute(session: ConsoleJwtPayload): void {
  if (!consoleUserCanAdminTeam(session.role)) {
    redirect('/console')
  }
}

/** Lead pages contain PII; only `admin` and `ops` may open them. */
export function requireConsoleLeadsRoute(session: ConsoleJwtPayload): void {
  if (!userHasConsolePermission(session.role, 'leads:read')) {
    redirect('/console')
  }
}
