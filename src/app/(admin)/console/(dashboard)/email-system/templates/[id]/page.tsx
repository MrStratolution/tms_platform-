import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ConsoleSystemEmailTemplateEditor } from '@/components/console/ConsoleSystemEmailTemplateEditor'
import { getCustomDb } from '@/db/client'
import { normalizeAdminUiLocale } from '@/lib/adminI18n'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { getSystemEmailTemplateById } from '@/lib/email/systemStore'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `SMTP email template ${id}` }
}

export default async function ConsoleEmailSystemTemplatePage(props: Props) {
  const session = await requireConsoleSession()
  const locale = normalizeAdminUiLocale(session.uiLocale)
  const canEdit = consoleUserCanWriteContent(session.role)
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

  const row = await getSystemEmailTemplateById(db, id)
  if (!row) notFound()

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/email-system/templates">← SMTP email templates</Link>
      </p>
      <h1 className="tma-console-page-title">
        {row.key} · {row.language.toUpperCase()}
      </h1>
      <ConsoleSystemEmailTemplateEditor template={row} canEdit={canEdit} locale={locale} />
    </main>
  )
}
