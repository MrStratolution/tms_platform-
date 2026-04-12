import { z } from 'zod'

import { resolveCaseStudyGridSelectionMode } from '@/lib/caseStudyGrid'
import { normalizeNavHref } from '@/lib/cms/navHref'
import type { Page } from '@/types/cms'

export type PageSurfaceFields = {
  seoTitle: string
  seoDescription: string
  seoCanonicalUrl: string
  seoOgImageUrl: string
  navigationLabel: string
  navigationHref: string
  navOrder: string
  pageTheme: string
  maxWidthMode: string
  sectionSpacingPreset: string
  headerVariant: string
  footerVariant: string
  pageCustomCss: string
  trackingGtm: string
  trackingMetaPixel: string
  trackingLinkedIn: string
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return { ...(v as Record<string, unknown>) }
  }
  return {}
}

function normalizeLayoutBlocks(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return block
    const next = { ...(block as Record<string, unknown>) }
    if (next.blockType === 'teamGrid') {
      next.members = []
    }
    if (next.blockType === 'caseStudyGrid') {
      const mode = resolveCaseStudyGridSelectionMode(
        next as Partial<Extract<NonNullable<Page['layout']>[number], { blockType: 'caseStudyGrid' }>>,
      )
      next.selectionMode = mode
      if (mode === 'automatic') {
        next.studies = []
      }
    }
    return next
  })
}

/**
 * Normalize page-builder document structure for the current console contract.
 * `teamGrid` is library-driven and always renders all active team members.
 * `caseStudyGrid` stores an explicit manual/automatic mode so editors do not have to infer hidden behavior.
 */
export function normalizePageBuilderDocument(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...document }
  if ('layout' in next) {
    next.layout = normalizeLayoutBlocks(next.layout)
  }
  return next
}

/** Pull common fields from a page `document` for the structured form. */
export function extractPageSurfaceFromDocument(doc: Record<string, unknown>): PageSurfaceFields {
  const seo = asRecord(doc.seo)
  return {
    seoTitle: typeof seo.title === 'string' ? seo.title : '',
    seoDescription: typeof seo.description === 'string' ? seo.description : '',
    seoCanonicalUrl: typeof seo.canonicalUrl === 'string' ? seo.canonicalUrl : '',
    seoOgImageUrl: typeof seo.ogImageUrl === 'string' ? seo.ogImageUrl : '',
    navigationLabel: typeof doc.navigationLabel === 'string' ? doc.navigationLabel : '',
    navigationHref:
      typeof doc.navigationHref === 'string' ? doc.navigationHref : '',
    navOrder:
      typeof doc.navOrder === 'number' && Number.isFinite(doc.navOrder)
        ? String(doc.navOrder)
        : '',
    pageTheme:
      doc.pageTheme === 'light' || doc.pageTheme === 'dark' || doc.pageTheme === 'default'
        ? String(doc.pageTheme)
        : 'inherit',
    maxWidthMode:
      doc.maxWidthMode === 'narrow' ||
      doc.maxWidthMode === 'full' ||
      doc.maxWidthMode === 'default'
        ? String(doc.maxWidthMode)
        : 'inherit',
    sectionSpacingPreset:
      doc.sectionSpacingPreset === 'compact' ||
      doc.sectionSpacingPreset === 'default' ||
      doc.sectionSpacingPreset === 'comfortable' ||
      doc.sectionSpacingPreset === 'spacious'
        ? String(doc.sectionSpacingPreset)
        : 'inherit',
    headerVariant:
      doc.headerVariant === 'minimal' || doc.headerVariant === 'default'
        ? String(doc.headerVariant)
        : 'inherit',
    footerVariant:
      doc.footerVariant === 'minimal' || doc.footerVariant === 'default'
        ? String(doc.footerVariant)
        : 'inherit',
    pageCustomCss: typeof doc.customCss === 'string' ? doc.customCss : '',
    trackingGtm: typeof (doc.trackingOverrides as Record<string, unknown> | undefined)?.gtmContainerId === 'string'
      ? String((doc.trackingOverrides as Record<string, unknown>).gtmContainerId)
      : '',
    trackingMetaPixel: typeof (doc.trackingOverrides as Record<string, unknown> | undefined)?.metaPixelId === 'string'
      ? String((doc.trackingOverrides as Record<string, unknown>).metaPixelId)
      : '',
    trackingLinkedIn: typeof (doc.trackingOverrides as Record<string, unknown> | undefined)?.linkedInPartnerId === 'string'
      ? String((doc.trackingOverrides as Record<string, unknown>).linkedInPartnerId)
      : '',
  }
}

/**
 * Merge structured page-level settings into a page document while preserving layout blocks.
 * Legacy page-level hero fields are stripped so hero stays canonical in `layout`.
 */
export function mergePageSurfaceIntoDocument(
  base: Record<string, unknown>,
  surface: PageSurfaceFields,
): Record<string, unknown> {
  const out: Record<string, unknown> = normalizePageBuilderDocument(base)
  const seo = asRecord(out.seo)

  const setOrDelete = (
    obj: Record<string, unknown>,
    key: string,
    val: string,
  ) => {
    const t = val.trim()
    if (t) obj[key] = t
    else delete obj[key]
  }

  setOrDelete(seo, 'title', surface.seoTitle)
  setOrDelete(seo, 'description', surface.seoDescription)
  setOrDelete(seo, 'canonicalUrl', surface.seoCanonicalUrl)
  setOrDelete(seo, 'ogImageUrl', surface.seoOgImageUrl)
  setOrDelete(out as Record<string, unknown>, 'navigationLabel', surface.navigationLabel)
  const navHrefNorm = normalizeNavHref(surface.navigationHref)
  if (navHrefNorm) (out as Record<string, unknown>).navigationHref = navHrefNorm
  else delete (out as Record<string, unknown>).navigationHref

  const navOrd = surface.navOrder.trim()
  if (navOrd === '' || !/^\d+$/.test(navOrd)) {
    delete (out as Record<string, unknown>).navOrder
  } else {
    ;(out as Record<string, unknown>).navOrder = Number.parseInt(navOrd, 10)
  }

  const setEnum = (key: string, val: string, allowed: string[]) => {
    const t = val.trim()
    if (!t || t === 'inherit' || !allowed.includes(t)) {
      delete out[key]
    } else {
      out[key] = t
    }
  }

  setEnum('pageTheme', surface.pageTheme, ['default', 'dark', 'light'])
  setEnum('maxWidthMode', surface.maxWidthMode, ['default', 'narrow', 'full'])
  setEnum(
    'sectionSpacingPreset',
    surface.sectionSpacingPreset,
    ['compact', 'default', 'comfortable', 'spacious'],
  )
  setEnum('headerVariant', surface.headerVariant, ['default', 'minimal'])
  setEnum('footerVariant', surface.footerVariant, ['default', 'minimal'])

  const pcss = surface.pageCustomCss.trim()
  if (pcss) out.customCss = pcss
  else delete out.customCss

  const tGtm = surface.trackingGtm.trim()
  const tMeta = surface.trackingMetaPixel.trim()
  const tLinked = surface.trackingLinkedIn.trim()
  if (tGtm || tMeta || tLinked) {
    const tObj: Record<string, string> = {}
    if (tGtm) tObj.gtmContainerId = tGtm
    if (tMeta) tObj.metaPixelId = tMeta
    if (tLinked) tObj.linkedInPartnerId = tLinked
    out.trackingOverrides = tObj
  } else {
    delete out.trackingOverrides
  }

  if (Object.keys(seo).length) out.seo = seo
  else delete out.seo
  delete out.hero
  delete out.primaryCta
  delete out.heroInsertIndex

  return out
}

/** Light validation after merge — ensures JSON object; caps size to avoid abuse. */
export const mergedPageDocumentSchema = z
  .record(z.unknown())
  .refine((o) => o !== null && typeof o === 'object' && !Array.isArray(o), {
    message: 'Document must be an object',
  })
  .refine((obj) => JSON.stringify(obj).length <= 1_500_000, {
    message: 'Document JSON is too large',
  })
