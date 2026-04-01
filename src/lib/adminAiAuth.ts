import { CONSOLE_SESSION_COOKIE } from '@/lib/console/constants'
import { verifyConsoleSessionToken } from '@/lib/console/jwt'

function sessionTokenFromRequest(request: Request): string | null {
  const raw = request.headers.get('cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const p = part.trim()
    const i = p.indexOf('=')
    if (i === -1) continue
    const name = decodeURIComponent(p.slice(0, i).trim())
    if (name === CONSOLE_SESSION_COOKIE) {
      return decodeURIComponent(p.slice(i + 1).trim())
    }
  }
  return null
}

/**
 * Console JWT (`/console` login) for server-side AI admin routes.
 */
export async function getAuthedConsoleAiUser(request: Request) {
  const token = sessionTokenFromRequest(request)
  if (!token) return null
  return verifyConsoleSessionToken(token)
}

export function canUseAiTools(user: { role: string } | null): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'ops'
}
