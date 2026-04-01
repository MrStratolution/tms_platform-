import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleLayoutBlockEditor } from '@/components/console/ConsoleLayoutBlockEditor'
import { getCustomDb } from '@/db/client'
import { cmsLayoutBlocks } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Saved block ${id}` }
}

export default async function ConsoleLayoutBlockEditPage(props: Props) {
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

  const rows = await db.select().from(cmsLayoutBlocks).where(eq(cmsLayoutBlocks.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  const block =
    row.block != null && typeof row.block === 'object' && !Array.isArray(row.block)
      ? (row.block as Record<string, unknown>)
      : {}

  const canEdit = consoleUserCanWriteContent(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/layout-blocks">← All saved blocks</Link>
      </p>
      <h1 className="tma-console-page-title">Saved layout block</h1>
      <ConsoleLayoutBlockEditor
        id={row.id}
        initial={{
          name: row.name,
          description: row.description,
          block,
          active: row.active,
        }}
        canEdit={canEdit}
      />
    </main>
  )
}
