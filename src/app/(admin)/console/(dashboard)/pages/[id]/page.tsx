import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { ConsolePageBuilderWorkspace } from '@/components/console/ConsolePageBuilderWorkspace'
import { ConsolePageToolbar } from '@/components/console/ConsolePageToolbar'
import { getCustomDb } from '@/db/client'
import { cmsPages } from '@/db/schema'
import {
  consoleUserCanAdminTeam,
  consoleUserCanEditCustomCss,
  consoleUserCanPublishLive,
  consoleUserCanWriteContent,
} from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'
import { DEFAULT_PUBLIC_LOCALE } from '@/lib/publicLocale'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  return { title: `Edit page ${id}` }
}

export default async function ConsolePageEditPage(props: Props) {
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

  const rows = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1)
  const page = rows[0]
  if (!page) notFound()

  const statusNorm =
    page.status === 'published' ||
    page.status === 'draft' ||
    page.status === 'review' ||
    page.status === 'archived' ||
    page.status === 'trashed'
      ? page.status
      : 'draft'
  const doc =
    page.document != null && typeof page.document === 'object' && !Array.isArray(page.document)
      ? (page.document as Record<string, unknown>)
      : {}

  const canEdit = consoleUserCanWriteContent(session.role)
  const canPublishLive = consoleUserCanPublishLive(session.role)
  const canEditCustomCss = consoleUserCanEditCustomCss(session.role)
  const canDelete = consoleUserCanAdminTeam(session.role)

  const previewSecret = process.env.INTERNAL_PREVIEW_SECRET?.trim()
  const visualPreviewUrl =
    previewSecret && page.slug
      ? `${getPublicSiteOrigin()}/${DEFAULT_PUBLIC_LOCALE}/preview/${encodeURIComponent(page.slug)}?secret=${encodeURIComponent(previewSecret)}`
      : null
  const publicPath = page.slug === 'home' ? `/${DEFAULT_PUBLIC_LOCALE}` : `/${DEFAULT_PUBLIC_LOCALE}/${page.slug}`

  return (
    <main className="tma-console-main wide tma-console-page-edit">
      <p className="tma-console-back">
        <Link href="/console/pages">← All pages</Link>
      </p>
      <h1 className="tma-console-page-title">Edit page</h1>
      <ConsolePageToolbar
        pageId={page.id}
        slug={page.slug}
        canPermanentlyDelete={canDelete}
        visualPreviewUrl={visualPreviewUrl}
        showRestore={page.status === 'trashed'}
        canRestore={canEdit}
        currentStatus={page.status}
        canQuickStatus={canEdit}
        canPublishLive={canPublishLive}
      />
      <ConsolePageBuilderWorkspace
        pageId={page.id}
        initialSlug={page.slug}
        initialTitle={page.title}
        initialPageType={page.pageType}
        initialStatus={statusNorm}
        initialDocument={doc}
        canEdit={canEdit}
        canPublishLive={canPublishLive}
        canEditCustomCss={canEditCustomCss}
        visualPreviewUrl={visualPreviewUrl}
        publicPath={publicPath}
      />
    </main>
  )
}
