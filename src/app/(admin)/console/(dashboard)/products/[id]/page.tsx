import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleProductEditor } from '@/components/console/ConsoleProductEditor'
import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { MIGRATE_HINT, isMissingDbRelationError } from '@/lib/db/errors'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Product ${id}` }
}

export default async function ConsoleProductEditPage(props: Props) {
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

  let row: (typeof cmsProducts.$inferSelect) | undefined
  try {
    const rows = await db.select().from(cmsProducts).where(eq(cmsProducts.id, id)).limit(1)
    row = rows[0]
  } catch (e) {
    if (isMissingDbRelationError(e)) {
      return (
        <main className="tma-console-main wide">
          <p className="tma-console-back">
            <Link href="/console/products">← All products</Link>
          </p>
          <p className="tma-console-lead tma-console-lead--error" role="alert">
            The <code>cms_product</code> table is missing. {MIGRATE_HINT}
          </p>
        </main>
      )
    }
    throw e
  }
  if (!row) notFound()

  const doc =
    row.document != null && typeof row.document === 'object' && !Array.isArray(row.document)
      ? (row.document as Record<string, unknown>)
      : {}

  const canEdit = consoleUserCanWriteContent(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/products">← All products</Link>
      </p>
      <h1 className="tma-console-page-title">Product</h1>
      <ConsoleProductEditor
        id={row.id}
        initialSlug={row.slug}
        initialName={row.name}
        initialStatus={row.status}
        initialDocument={doc}
        canEdit={canEdit}
      />
    </main>
  )
}
