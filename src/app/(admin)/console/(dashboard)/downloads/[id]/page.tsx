import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleDownloadAssetEditor } from '@/components/console/ConsoleDownloadAssetEditor'
import { getCustomDb } from '@/db/client'
import { cmsDownloadAssets } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Download ${id}` }
}

export default async function ConsoleDownloadEditPage(props: Props) {
  const session = await requireConsoleSession()
  const id = Number.parseInt((await props.params).id, 10)
  if (!Number.isFinite(id) || id < 1) notFound()

  const db = getCustomDb()
  if (!db) {
    return (
      <main className="tma-console-main wide">
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      </main>
    )
  }

  const rows = await db.select().from(cmsDownloadAssets).where(eq(cmsDownloadAssets.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  const canEdit = consoleUserCanWriteContent(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/downloads">← All downloads</Link>
      </p>
      <h1 className="tma-console-page-title">Download asset</h1>
      <ConsoleDownloadAssetEditor
        id={row.id}
        initial={{
          title: row.title,
          description: row.description,
          fileUrl: row.fileUrl,
          fileLabel: row.fileLabel,
          active: row.active,
        }}
        canEdit={canEdit}
      />
    </main>
  )
}
