import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleFormConfigEditor } from '@/components/console/ConsoleFormConfigEditor'
import { getCustomDb } from '@/db/client'
import { cmsFormConfigs } from '@/db/schema'
import { consoleUserCanEditCustomCss, consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Form config ${id}` }
}

export default async function ConsoleFormConfigEditPage(props: Props) {
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

  const rows = await db.select().from(cmsFormConfigs).where(eq(cmsFormConfigs.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  const doc =
    row.document != null && typeof row.document === 'object' && !Array.isArray(row.document)
      ? (row.document as Record<string, unknown>)
      : {}

  const canEdit = consoleUserCanWriteContent(session.role)
  const canAdvanced = consoleUserCanEditCustomCss(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/forms">← All form configs</Link>
      </p>
      <h1 className="tma-console-page-title">Form config</h1>
      <ConsoleFormConfigEditor
        id={row.id}
        formType={row.formType}
        initialActive={row.active}
        initialDocument={doc}
        canEdit={canEdit}
        canAdvanced={canAdvanced}
      />
    </main>
  )
}
