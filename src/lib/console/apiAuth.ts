import { NextResponse } from 'next/server'

import { getAuthedConsoleAiUser } from '@/lib/adminAiAuth'

import type { ConsolePermission } from '@/lib/console/rbac'
import { userHasConsolePermission } from '@/lib/console/rbac'

/**
 * JSON Route Handlers under `/api/console/*`: valid `/console` JWT + optional permission.
 */
export async function requireConsoleJsonAuth(
  request: Request,
  permission?: ConsolePermission,
) {
  const user = await getAuthedConsoleAiUser(request)
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (permission && !userHasConsolePermission(user.role, permission)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { ok: true as const, user }
}
