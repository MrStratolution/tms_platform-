import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreatePageForm } from '@/components/console/ConsoleCreatePageForm'
import { consoleUserCanPublishLive } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

export const metadata: Metadata = {
  title: 'New news article',
}

export default async function ConsoleNewNewsPage() {
  const session = await requireConsoleSession()
  const canPublishLive = consoleUserCanPublishLive(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/news">← All news articles</Link>
      </p>
      <h1 className="tma-console-page-title">Create news / blog article</h1>
      <p className="tma-console-lead">
        Creates a page with <code>pageType = resource</code> and a news-friendly starter layout.
      </p>
      <ConsoleCreatePageForm
        canPublishLive={canPublishLive}
        uiLocale={session.uiLocale}
        initialPageType="resource"
        initialTemplate="news_article"
        lockPageType
      />
    </main>
  )
}
