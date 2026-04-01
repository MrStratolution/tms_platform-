import { and, eq } from 'drizzle-orm'

import { cmsPageLocalizations } from '@/db/schema'

import type { CmsDb } from './cmsData'

const localeTag = /^[a-z]{2}(-[A-Za-z0-9]+)?$/i

function validLocale(s: string): boolean {
  return localeTag.test(s.trim())
}

/**
 * Queue or re-queue AI translation jobs for a page (hero + SEO + layout).
 */
export async function upsertQueuedPageLocalization(
  db: CmsDb,
  opts: {
    pageId: number
    locale: string
    sourceLocale?: string | null
  },
): Promise<{ id: number; requeued: boolean }> {
  const loc = opts.locale.trim()
  const src = opts.sourceLocale?.trim() || 'de'
  if (!validLocale(loc)) {
    throw new Error('Invalid locale tag')
  }
  if (!validLocale(src)) {
    throw new Error('Invalid source locale tag')
  }

  const existing = await db
    .select({ id: cmsPageLocalizations.id })
    .from(cmsPageLocalizations)
    .where(
      and(eq(cmsPageLocalizations.pageId, opts.pageId), eq(cmsPageLocalizations.locale, loc)),
    )
    .limit(1)

  const now = new Date()
  if (existing[0]) {
    await db
      .update(cmsPageLocalizations)
      .set({
        jobStatus: 'queued',
        sourceLocale: src,
        lastError: null,
        layoutJson: null,
        updatedAt: now,
      })
      .where(eq(cmsPageLocalizations.id, existing[0].id))
    return { id: existing[0].id, requeued: true }
  }

  const [row] = await db
    .insert(cmsPageLocalizations)
    .values({
      pageId: opts.pageId,
      locale: loc,
      sourceLocale: src,
      jobStatus: 'queued',
      updatedAt: now,
    })
    .returning({ id: cmsPageLocalizations.id })

  if (!row) {
    throw new Error('Insert failed')
  }
  return { id: row.id, requeued: false }
}

export async function queueLocalesForPage(
  db: CmsDb,
  pageId: number,
  targetLocales: string[],
  sourceLocale?: string | null,
): Promise<{ id: number; requeued: boolean }[]> {
  const out: { id: number; requeued: boolean }[] = []
  const seen = new Set<string>()
  for (const raw of targetLocales) {
    const loc = raw.trim()
    if (!loc || seen.has(loc)) continue
    seen.add(loc)
    out.push(await upsertQueuedPageLocalization(db, { pageId, locale: loc, sourceLocale }))
  }
  return out
}
