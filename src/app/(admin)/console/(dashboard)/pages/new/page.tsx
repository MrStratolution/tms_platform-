import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreatePageForm } from '@/components/console/ConsoleCreatePageForm'
import { adminCopy } from '@/lib/adminI18n'
import { consoleUserCanPublishLive } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

export const metadata: Metadata = {
  title: 'New page',
}

export default async function ConsoleNewPage() {
  const session = await requireConsoleSession()
  const t = (key: Parameters<typeof adminCopy>[1]) => adminCopy(session.uiLocale, key)
  const canPublishLive = consoleUserCanPublishLive(session.role)
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/pages">← All pages</Link>
      </p>
      <h1 className="tma-console-page-title">{t('createPageTitle')}</h1>
      <p className="tma-console-lead">{t('createPageLead')}</p>
      <ConsoleCreatePageForm canPublishLive={canPublishLive} uiLocale={session.uiLocale} />
    </main>
  )
}
