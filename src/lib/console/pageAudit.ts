import { cmsAuditLogs, cmsPageRevisions } from '@/db/schema'

import type { CmsDb } from '@/lib/cmsData'

export async function createPageRevision(
  db: CmsDb,
  input: {
    pageId: number
    title: string
    slug: string
    pageType: string
    status: string
    document: unknown
    reason?: string | null
    actorUserId?: string | null
    actorEmail?: string | null
  },
) {
  await db.insert(cmsPageRevisions).values({
    pageId: input.pageId,
    title: input.title,
    slug: input.slug,
    pageType: input.pageType,
    status: input.status,
    document: input.document,
    reason: input.reason ?? null,
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    createdAt: new Date(),
  })
}

export async function createAuditLog(
  db: CmsDb,
  input: {
    action: string
    entityType: string
    entityId: string | number
    actorUserId?: string | null
    actorEmail?: string | null
    payload?: unknown
  },
) {
  await db.insert(cmsAuditLogs).values({
    action: input.action,
    entityType: input.entityType,
    entityId: String(input.entityId),
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    payload: (input.payload ?? null) as Record<string, unknown> | null,
    createdAt: new Date(),
  })
}
