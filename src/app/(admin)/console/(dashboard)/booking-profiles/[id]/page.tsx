import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsoleBookingProfileEditor } from '@/components/console/ConsoleBookingProfileEditor'
import { getCustomDb } from '@/db/client'
import { cmsBookingProfiles } from '@/db/schema'
import { consoleUserCanEditCustomCss, consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Booking profile ${id}` }
}

export default async function ConsoleBookingProfileEditPage(props: Props) {
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

  const rows = await db
    .select()
    .from(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.id, id))
    .limit(1)
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
        <Link href="/console/booking-profiles">← All booking profiles</Link>
      </p>
      <h1 className="tma-console-page-title">Booking profile</h1>
      <ConsoleBookingProfileEditor
        id={row.id}
        initialInternalSlug={row.internalSlug}
        initialActive={row.active}
        initialDocument={doc}
        canEdit={canEdit}
        canAdvanced={canAdvanced}
      />
    </main>
  )
}
