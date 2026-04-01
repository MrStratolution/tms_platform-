import type { Metadata } from 'next'

import { ConsoleMediaManager } from '@/components/console/ConsoleMediaManager'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

export const metadata: Metadata = {
  title: 'Media',
}

export default async function ConsoleMediaPage() {
  const session = await requireConsoleSession()
  const canEdit = consoleUserCanWriteContent(session.role)

  return (
    <main className="tma-console-main wide">
        <h1 className="tma-console-page-title">Media</h1>
        <p className="tma-console-lead">
          Upload images for use in page JSON (hero, blocks). Copy the public URL into your page
          document or block props.
        </p>
        <ConsoleMediaManager canEdit={canEdit} />
    </main>
  )
}
