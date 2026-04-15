import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { ConsoleIndustryEditor } from '@/components/console/ConsoleIndustryEditor'
import { getCustomDb } from '@/db/client'
import { cmsIndustries } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Industry ${id}` }
}

export default async function ConsoleIndustryDetailPage(props: Props) {
  const session = await requireConsoleSession()
  const db = getCustomDb()
  const id = Number.parseInt((await props.params).id, 10)
  if (!db || !Number.isFinite(id) || id < 1) notFound()
  const rows = await db.select().from(cmsIndustries).where(eq(cmsIndustries.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/industries">← All industries</Link></p>
      <h1 className="tma-console-page-title">{row.name}</h1>
      <p className="tma-console-lead">
        Reusable industry entry for positioning, challenge framing, and industry sections on CMS pages.
      </p>
      <ConsoleIndustryEditor
        id={row.id}
        initial={{
          name: row.name,
          slug: row.slug,
          summary: row.summary,
          messaging: row.messaging,
          active: row.active,
        }}
        canEdit={consoleUserCanWriteContent(session.role)}
      />
    </main>
  )
}
