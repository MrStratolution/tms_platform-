import { cookies } from 'next/headers'

import { CONSOLE_SESSION_COOKIE } from '@/lib/console/constants'
import {
  type ConsoleJwtPayload,
  verifyConsoleSessionToken,
} from '@/lib/console/jwt'

export async function getConsoleSession(): Promise<ConsoleJwtPayload | null> {
  const token = (await cookies()).get(CONSOLE_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyConsoleSessionToken(token)
}
