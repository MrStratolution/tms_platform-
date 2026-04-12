import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleTestimonialEditor } from '@/components/console/ConsoleTestimonialEditor'
import { getCustomDb } from '@/db/client'
import { cmsTestimonials } from '@/db/schema'
import { consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Testimonial ${id}` }
}

export default async function ConsoleTestimonialEditPage(props: Props) {
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

  const rows = await db.select().from(cmsTestimonials).where(eq(cmsTestimonials.id, id)).limit(1)
  const row = rows[0]
  if (!row) notFound()

  const canEdit = consoleUserCanWriteContent(session.role)

  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/testimonials">← All testimonials</Link>
      </p>
      <h1 className="tma-console-page-title">Testimonial</h1>
      <ConsoleTestimonialEditor
        id={row.id}
        initial={{
          quote: row.quote,
          author: row.author,
          role: row.role,
          company: row.company,
          photoMediaId: row.photoMediaId,
          logoMediaId: row.logoMediaId,
          active: row.active,
        }}
        canEdit={canEdit}
      />
    </main>
  )
}
