import { eq } from 'drizzle-orm'

import { translatePageHeroSeo, translatePageLayoutBlocks } from '@/lib/aiLocalizePage'
import { cmsPageLocalizations, cmsPages } from '@/db/schema'
import { getPrimaryHeroBlock } from '@/lib/cms/canonicalHeroBlock'
import { validateTranslatedLayout } from '@/lib/layoutTranslationGuard'
import type { CmsDb } from './cmsData'
import { rowToPage } from './cmsData'

export async function processOneLocalizationJob(
  db: CmsDb,
  jobId: number,
): Promise<void> {
  const jobRows = await db
    .select()
    .from(cmsPageLocalizations)
    .where(eq(cmsPageLocalizations.id, jobId))
    .limit(1)
  const job = jobRows[0]
  if (
    !job ||
    (job.jobStatus !== 'queued' && job.jobStatus !== 'failed')
  ) {
    return
  }

  const pageId = job.pageId
  if (typeof pageId !== 'number') {
    await db
      .update(cmsPageLocalizations)
      .set({ jobStatus: 'failed', lastError: 'Missing page reference' })
      .where(eq(cmsPageLocalizations.id, jobId))
    return
  }

  const pageRows = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.id, pageId))
    .limit(1)
  const pageRow = pageRows[0]
  if (!pageRow) {
    await db
      .update(cmsPageLocalizations)
      .set({ jobStatus: 'failed', lastError: 'Page not found' })
      .where(eq(cmsPageLocalizations.id, jobId))
    return
  }

  const p = rowToPage(pageRow)
  const sourceLocale = job.sourceLocale || 'de'
  const targetLocale = job.locale

  await db
    .update(cmsPageLocalizations)
    .set({ jobStatus: 'running', lastError: null })
    .where(eq(cmsPageLocalizations.id, jobId))

  try {
    const heroBlock = getPrimaryHeroBlock(p.layout)
    const translated = await translatePageHeroSeo({
      sourceLocale,
      targetLocale,
      heroHeadline: heroBlock?.headline || p.hero?.headline || p.title || '',
      heroSubheadline: heroBlock?.subheadline || p.hero?.subheadline || '',
      seoTitle: p.seo?.title || p.title || '',
      seoDescription: p.seo?.description || '',
    })

    const layout = p.layout
    let layoutJson: unknown = null
    if (Array.isArray(layout) && layout.length > 0) {
      const tl = await translatePageLayoutBlocks({
        sourceLocale,
        targetLocale,
        layout,
      })
      layoutJson = validateTranslatedLayout(layout, tl)
    }

    await db
      .update(cmsPageLocalizations)
      .set({
        jobStatus: 'ready',
        lastError: null,
        heroHeadline: translated.heroHeadline,
        heroSubheadline: translated.heroSubheadline,
        seoTitle: translated.seoTitle,
        seoDescription: translated.seoDescription,
        layoutJson,
      })
      .where(eq(cmsPageLocalizations.id, jobId))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await db
      .update(cmsPageLocalizations)
      .set({ jobStatus: 'failed', lastError: msg })
      .where(eq(cmsPageLocalizations.id, jobId))
  }
}
