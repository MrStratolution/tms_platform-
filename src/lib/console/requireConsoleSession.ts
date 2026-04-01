import { redirect } from 'next/navigation'

import type { ConsoleJwtPayload } from '@/lib/console/jwt'
import { getConsoleSession } from '@/lib/console/session'

export async function requireConsoleSession(): Promise<ConsoleJwtPayload> {
  const session = await getConsoleSession()
  if (!session) {
    redirect('/console/login')
  }
  return session
}
