import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { ConsoleServiceEditor } from '@/components/console/ConsoleServiceEditor'
import { getCustomDb } from '@/db/client'
import { cmsServices } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Service ${id}` }
}

export default async function ConsoleServiceDetailPage(props: Props) {
  const session = await requireConsoleSession()
  const db = getCustomDb()
  const id = Number.parseInt((await props.params).id, 10)
  if (!db || !Number.isFinite(id) || id < 1) notFound()
  const rows = await db.select().from(cmsServices).where(eq(cmsServices.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/services">← All services</Link></p>
      <h1 className="tma-console-page-title">{row.name}</h1>
      <p className="tma-console-lead">
        Reusable service entry for library-backed services sections and attribution across the CMS.
      </p>
      <ConsoleServiceEditor
        id={row.id}
        initial={{
          name: row.name,
          slug: row.slug,
          summary: row.summary,
          promise: row.promise,
          proof: row.proof,
          active: row.active,
        }}
        canEdit={consoleUserCanWriteContent(session.role)}
      />
    </main>
  )
}
