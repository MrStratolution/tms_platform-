import type { ReactNode } from 'react'

import { ConsoleAppShell } from '@/components/console/ConsoleAppShell'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

export default async function ConsoleDashboardLayout(props: { children: ReactNode }) {
  const session = await requireConsoleSession()

  return (
    <ConsoleAppShell email={session.email} userRole={session.role} userLocale={session.uiLocale}>
      {props.children}
    </ConsoleAppShell>
  )
}
