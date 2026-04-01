import type { Page } from '@/types/cms'

import type { CmsDb } from './cmsData'
import {
  getPublishedHomePage as loadHome,
  getPublishedPageBySlug as loadBySlug,
} from './cmsData'

export async function getPublishedPageBySlug(
  db: CmsDb,
  slug: string,
): Promise<Page | null> {
  return loadBySlug(db, slug)
}

export async function getPublishedHomePage(db: CmsDb): Promise<Page | null> {
  return loadHome(db)
}

/**
 * JSON body for `GET /api/pages/{slug}` (and preview) — public fields only.
 */
export function toPublicPageJson(page: Page) {
  return {
    slug: page.slug,
    pageType: page.pageType,
    title: page.title,
    status: page.status,
    hero: page.hero,
    primaryCta: page.primaryCta,
    layout: page.layout,
    seo: page.seo,
    tracking: page.tracking,
    defaultFormConfig: page.defaultFormConfig,
    defaultBookingProfile: page.defaultBookingProfile,
  }
}
