/**
 * Console roles on `tma_custom.admin_user.role`: `admin` | `ops` | `editor` | `viewer`.
 * Aliases (spec / org naming): `super_admin`, `marketing` → editor-like, `sales_ops` → ops-like.
 * Default in DB is `admin` when omitted.
 */
export type ConsolePermission =
  | 'content:read'
  | 'content:write'
  | 'content:publish'
  | 'leads:read'
  | 'leads:write'
  | 'team:admin'

function normalizeConsoleRole(role: string | undefined): string {
  const raw = (role || 'admin').toLowerCase().replace(/-/g, '_')
  if (raw === 'super_admin' || raw === 'superadmin') return 'admin'
  if (raw === 'marketing') return 'editor'
  if (raw === 'sales_ops' || raw === 'salesops') return 'ops'
  return raw
}

export function userHasConsolePermission(
  role: string | undefined,
  perm: ConsolePermission,
): boolean {
  const r = normalizeConsoleRole(role)
  if (r === 'admin') return true

  switch (perm) {
    case 'team:admin':
      return false
    case 'content:read':
      return true
    case 'content:publish':
      return r === 'ops' || r === 'admin'
    case 'leads:read':
      return r === 'ops' || r === 'editor'
    case 'leads:write':
      return r === 'ops' || r === 'editor'
    case 'content:write':
      return r === 'ops' || r === 'editor'
    default:
      return false
  }
}

/** Publish / unpublish live pages (and transitions off the live published state). */
export function consoleUserCanPublishLive(role: string | undefined): boolean {
  return userHasConsolePermission(role, 'content:publish')
}

export function consoleUserCanWriteContent(role: string | undefined): boolean {
  return userHasConsolePermission(role, 'content:write')
}

export function consoleUserCanAdminTeam(role: string | undefined): boolean {
  return userHasConsolePermission(role, 'team:admin')
}

export function consoleUserCanWriteLeads(role: string | undefined): boolean {
  return userHasConsolePermission(role, 'leads:write')
}

/** Raw site / page custom CSS and similar advanced controls. */
export function consoleUserCanEditCustomCss(role: string | undefined): boolean {
  const r = normalizeConsoleRole(role)
  return r === 'admin' || r === 'ops'
}
