import { eq } from 'drizzle-orm'

import { hydrateLayoutContentLibraries } from '@/lib/cms/hydrateContentLibraries'
import { cmsBookingProfiles, cmsFormConfigs, cmsLayoutBlocks } from '@/db/schema'
import type { CmsDb } from '@/lib/cmsData'
import type { Page } from '@/types/cms'

/**
 * Expand `layout` blocks that reference `cms_form_config` / `cms_booking_profile` by numeric id
 * into full embedded objects for public rendering (FormBlock / BookingBlock).
 */
export async function hydratePageLayoutRelations(db: CmsDb, page: Page): Promise<Page> {
  const layout = page.layout
  if (!Array.isArray(layout) || layout.length === 0) return page

  const nextLayout = await Promise.all(
    layout.map(async (block) => {
      if (!block || typeof block !== 'object' || Array.isArray(block)) return block
      const b = block as unknown as Record<string, unknown>

      if (b.blockType === 'form' && typeof b.formConfig === 'number') {
        const rows = await db
          .select()
          .from(cmsFormConfigs)
          .where(eq(cmsFormConfigs.id, b.formConfig))
          .limit(1)
        const r = rows[0]
        if (!r) return block
        const doc =
          r.document && typeof r.document === 'object' && !Array.isArray(r.document)
            ? (r.document as Record<string, unknown>)
            : {}
        const name = typeof doc.name === 'string' ? doc.name : r.formType
        const resolved = {
          ...doc,
          id: r.id,
          name,
          formType: r.formType,
          active: r.active,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }
        return { ...b, formConfig: resolved }
      }

      if (b.blockType === 'layoutBlockRef' && typeof b.layoutBlockId === 'number') {
        const rows = await db
          .select()
          .from(cmsLayoutBlocks)
          .where(eq(cmsLayoutBlocks.id, b.layoutBlockId))
          .limit(1)
        const r = rows[0]
        if (!r || !r.active) return block
        const raw = r.block
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return block
        const inner = { ...(raw as Record<string, unknown>) }
        const preserve = (key: string) => {
          if (Object.prototype.hasOwnProperty.call(b, key) && b[key] != null) {
            inner[key] = b[key]
          }
        }
        if (typeof b.id === 'string' && b.id) inner.id = b.id
        if (typeof b.blockName === 'string') inner.blockName = b.blockName
        preserve('anchorId')
        preserve('sectionSpacingY')
        preserve('widthMode')
        preserve('customClass')
        preserve('sectionHidden')
        return inner
      }

      if (b.blockType === 'booking' && typeof b.bookingProfile === 'number') {
        const rows = await db
          .select()
          .from(cmsBookingProfiles)
          .where(eq(cmsBookingProfiles.id, b.bookingProfile))
          .limit(1)
        const r = rows[0]
        if (!r) return block
        const doc =
          r.document && typeof r.document === 'object' && !Array.isArray(r.document)
            ? (r.document as Record<string, unknown>)
            : {}
        const resolved = {
          ...doc,
          id: r.id,
          internalSlug: r.internalSlug,
          active: r.active,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }
        return { ...b, bookingProfile: resolved }
      }

      return block
    }),
  )

  const withLibraries = await hydrateLayoutContentLibraries(
    db,
    nextLayout as NonNullable<Page['layout']>,
  )

  return { ...page, layout: withLibraries }
}
