import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { cache } from 'react'
import { z } from 'zod'

import { cmsSiteSettings } from '@/db/schema'

import type { CmsDb } from './cmsData'
import { tryGetCmsDb } from './cmsData'
import { absoluteMediaUrl } from './mediaUrl'

const gtmIdSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^GTM-[A-Z0-9]+$/i, 'Use format GTM-XXXXXXX')

const brandingSchema = z
  .object({
    siteName: z.string().max(200).optional(),
    logoLightUrl: z.string().max(2000).optional(),
    logoDarkUrl: z.string().max(2000).optional(),
    faviconUrl: z.string().max(2000).optional(),
  })
  .strict()

const typographySchema = z
  .object({
    headingFontStack: z.string().max(500).optional(),
    bodyFontStack: z.string().max(500).optional(),
  })
  .strict()

const layoutTokensSchema = z
  .object({
    maxContentWidth: z.string().max(64).optional(),
    sectionPaddingY: z.string().max(64).optional(),
    containerPaddingX: z.string().max(64).optional(),
    borderRadiusScale: z.string().max(32).optional(),
  })
  .strict()

const headerSettingsSchema = z
  .object({
    navCtaLabel: z.string().max(120).optional(),
    navCtaLabelEn: z.string().max(120).optional(),
    navCtaHref: z.string().max(500).optional(),
    navCtaStyle: z.enum(['primary', 'secondary', 'ghost']).optional(),
    logoLightUrl: z.string().max(2000).optional(),
    logoDarkUrl: z.string().max(2000).optional(),
    logoAlt: z.string().max(200).optional(),
    logoWidthDesktop: z.number().int().min(80).max(360).optional(),
    logoWidthMobile: z.number().int().min(56).max(240).optional(),
    sticky: z.boolean().optional(),
    transparentOnHero: z.boolean().optional(),
    layout: z.enum(['split', 'centered']).optional(),
    mobileBehavior: z.enum(['drawer', 'sheet']).optional(),
    announcement: z
      .object({
        enabled: z.boolean().optional(),
        text: z.string().max(300).optional(),
        textEn: z.string().max(300).optional(),
        href: z.string().max(500).optional(),
        style: z.enum(['subtle', 'highlight', 'outline']).optional(),
      })
      .strict()
      .optional(),
    navigationItems: z
      .array(
        z
          .object({
            id: z.string().max(120),
            type: z.enum(['page', 'product', 'service', 'industry', 'booking', 'external']),
            href: z.string().max(500),
            refId: z.number().int().positive().optional(),
            label: z.string().max(120),
            labelEn: z.string().max(120).optional(),
            badge: z.string().max(60).optional(),
            badgeEn: z.string().max(60).optional(),
            newTab: z.boolean().optional(),
            showOnDesktop: z.boolean().optional(),
            showOnMobile: z.boolean().optional(),
          })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict()

const footerLegalLinkSchema = z.object({
  label: z.string().max(100),
  href: z.string().max(500),
})

const colorTokensSchema = z
  .object({
    primary: z.string().max(64).optional(),
    secondary: z.string().max(64).optional(),
    accent: z.string().max(64).optional(),
    surfaceBg: z.string().max(64).optional(),
    textDefault: z.string().max(64).optional(),
    success: z.string().max(64).optional(),
    warning: z.string().max(64).optional(),
    error: z.string().max(64).optional(),
  })
  .strict()

const contactInfoSchema = z
  .object({
    email: z.string().max(300).optional(),
    phone: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    companyName: z.string().max(300).optional(),
  })
  .strict()

const socialLinkSchema = z.object({
  platform: z.string().max(64),
  url: z.string().max(1000),
  label: z.string().max(200).optional(),
})

const socialLinksSchema = z.array(socialLinkSchema).max(20)

const footerSettingsSchema = z
  .object({
    legalLinks: z.array(footerLegalLinkSchema).max(12).optional(),
    straplineOverride: z.string().max(400).optional(),
    straplineOverrideEn: z.string().max(400).optional(),
    logoUrl: z.string().max(2000).optional(),
    logoAlt: z.string().max(200).optional(),
    logoWidth: z.number().int().min(80).max(360).optional(),
    layout: z.enum(['stacked', 'columns', 'compact']).optional(),
    ctaLabel: z.string().max(120).optional(),
    ctaLabelEn: z.string().max(120).optional(),
    ctaHref: z.string().max(500).optional(),
    ctaStyle: z.enum(['primary', 'secondary', 'ghost']).optional(),
    metaLine: z.string().max(240).optional(),
    metaLineEn: z.string().max(240).optional(),
    showContact: z.boolean().optional(),
    showSocialLinks: z.boolean().optional(),
    contact: contactInfoSchema.optional(),
    socialLinks: socialLinksSchema.optional(),
  })
  .strict()

const motionSettingsSchema = z
  .object({
    transitionsEnabled: z.boolean().optional(),
  })
  .strict()

export const siteSettingsDocumentSchema = z
  .object({
    defaultTitle: z.string().max(200).optional(),
    defaultDescription: z.string().max(500).optional(),
    titleTemplate: z.string().max(200).optional(),
    twitterSite: z.string().max(100).optional(),
    ogImageUrl: z.string().max(2000).optional(),
    googleSiteVerification: z.string().max(300).optional(),
    gtmContainerId: z.union([z.literal(''), gtmIdSchema]).optional(),
    branding: brandingSchema.optional(),
    typography: typographySchema.optional(),
    layout: layoutTokensSchema.optional(),
    header: headerSettingsSchema.optional(),
    footer: footerSettingsSchema.optional(),
    motion: motionSettingsSchema.optional(),
    colors: colorTokensSchema.optional(),
    contactInfo: contactInfoSchema.optional(),
    socialLinks: socialLinksSchema.optional(),
    customCss: z.string().max(100_000).optional(),
  })
  .strict()

export type SiteSettingsDocument = z.infer<typeof siteSettingsDocumentSchema>

/** PATCH body: only include keys you intend to set or clear (empty string removes that key). */
export const siteSettingsPatchDocumentSchema = z
  .object({
    defaultTitle: z.string().max(200).optional(),
    defaultDescription: z.string().max(500).optional(),
    titleTemplate: z.string().max(200).optional(),
    twitterSite: z.string().max(100).optional(),
    ogImageUrl: z.string().max(2000).optional(),
    googleSiteVerification: z.string().max(300).optional(),
    gtmContainerId: z.string().max(32).optional(),
    branding: brandingSchema.partial().optional(),
    typography: typographySchema.partial().optional(),
    layout: layoutTokensSchema.partial().optional(),
    header: headerSettingsSchema.partial().optional(),
    footer: footerSettingsSchema.partial().optional(),
    motion: motionSettingsSchema.partial().optional(),
    colors: colorTokensSchema.partial().optional(),
    contactInfo: contactInfoSchema.partial().optional(),
    socialLinks: socialLinksSchema.optional(),
    customCss: z.string().max(100_000).optional(),
  })
  .strict()

export type SiteSettingsPatchDocument = z.infer<typeof siteSettingsPatchDocumentSchema>

const STRING_PATCH_KEYS = [
  'defaultTitle',
  'defaultDescription',
  'titleTemplate',
  'twitterSite',
  'ogImageUrl',
  'googleSiteVerification',
  'gtmContainerId',
] as const satisfies readonly (keyof SiteSettingsPatchDocument)[]

function mergeStringFields(
  next: Record<string, unknown>,
  patch: SiteSettingsPatchDocument,
  keys: readonly string[],
) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const raw = patch[key as keyof SiteSettingsPatchDocument]
    if (raw === undefined) continue
    const t = String(raw).trim()
    if (!t) delete next[key]
    else next[key] = t
  }
}

function mergeOptionalNestedStrings<T extends Record<string, unknown>>(
  prev: T | undefined,
  patch: Partial<T> | undefined,
): T | undefined {
  if (!patch) return prev
  const base = { ...(prev ?? {}) } as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    if (typeof v === 'string') {
      const t = v.trim()
      if (!t) delete base[k]
      else base[k] = t
    } else {
      base[k] = v
    }
  }
  return Object.keys(base).length > 0 ? (base as T) : undefined
}

function mergeFooterPatch(
  prev: z.infer<typeof footerSettingsSchema> | undefined,
  patch: Partial<z.infer<typeof footerSettingsSchema>> | undefined,
): z.infer<typeof footerSettingsSchema> | undefined {
  if (!patch) return prev
  const out: Record<string, unknown> = { ...(prev ?? {}) }
  if (Object.prototype.hasOwnProperty.call(patch, 'straplineOverride')) {
    const t = patch.straplineOverride?.trim() ?? ''
    if (!t) delete out.straplineOverride
    else out.straplineOverride = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'straplineOverrideEn')) {
    const t = patch.straplineOverrideEn?.trim() ?? ''
    if (!t) delete out.straplineOverrideEn
    else out.straplineOverrideEn = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'logoUrl')) {
    const t = patch.logoUrl?.trim() ?? ''
    if (!t) delete out.logoUrl
    else out.logoUrl = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'logoAlt')) {
    const t = patch.logoAlt?.trim() ?? ''
    if (!t) delete out.logoAlt
    else out.logoAlt = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'logoWidth')) {
    if (typeof patch.logoWidth === 'number' && Number.isFinite(patch.logoWidth)) {
      out.logoWidth = Math.round(patch.logoWidth)
    } else {
      delete out.logoWidth
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'layout')) {
    if (!patch.layout) delete out.layout
    else out.layout = patch.layout
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ctaLabel')) {
    const t = patch.ctaLabel?.trim() ?? ''
    if (!t) delete out.ctaLabel
    else out.ctaLabel = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ctaLabelEn')) {
    const t = patch.ctaLabelEn?.trim() ?? ''
    if (!t) delete out.ctaLabelEn
    else out.ctaLabelEn = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ctaHref')) {
    const t = patch.ctaHref?.trim() ?? ''
    if (!t) delete out.ctaHref
    else out.ctaHref = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'ctaStyle')) {
    if (!patch.ctaStyle) delete out.ctaStyle
    else out.ctaStyle = patch.ctaStyle
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'metaLine')) {
    const t = patch.metaLine?.trim() ?? ''
    if (!t) delete out.metaLine
    else out.metaLine = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'metaLineEn')) {
    const t = patch.metaLineEn?.trim() ?? ''
    if (!t) delete out.metaLineEn
    else out.metaLineEn = t
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'showContact')) {
    out.showContact = Boolean(patch.showContact)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'showSocialLinks')) {
    out.showSocialLinks = Boolean(patch.showSocialLinks)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'contact')) {
    const merged = mergeOptionalNestedStrings(prev?.contact, patch.contact)
    if (merged) out.contact = merged
    else delete out.contact
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'socialLinks')) {
    const links = patch.socialLinks
    if (!links || links.length === 0) delete out.socialLinks
    else out.socialLinks = links
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'legalLinks')) {
    const links = patch.legalLinks
    if (!links || links.length === 0) delete out.legalLinks
    else out.legalLinks = links
  }
  return Object.keys(out).length > 0 ? (out as z.infer<typeof footerSettingsSchema>) : undefined
}

function mergeHeaderPatch(
  prev: z.infer<typeof headerSettingsSchema> | undefined,
  patch: Partial<z.infer<typeof headerSettingsSchema>> | undefined,
): z.infer<typeof headerSettingsSchema> | undefined {
  if (!patch) return prev
  const out: Record<string, unknown> = { ...(prev ?? {}) }

  const stringKeys = [
    'navCtaLabel',
    'navCtaLabelEn',
    'navCtaHref',
    'logoLightUrl',
    'logoDarkUrl',
    'logoAlt',
  ] as const
  for (const key of stringKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const raw = patch[key]
    if (raw === undefined) continue
    const trimmed = String(raw).trim()
    if (!trimmed) delete out[key]
    else out[key] = trimmed
  }

  const numberKeys = ['logoWidthDesktop', 'logoWidthMobile'] as const
  for (const key of numberKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const raw = patch[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = Math.round(raw)
    else delete out[key]
  }

  const enumKeys = ['navCtaStyle', 'layout', 'mobileBehavior'] as const
  for (const key of enumKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const raw = patch[key]
    if (!raw) delete out[key]
    else out[key] = raw
  }

  const boolKeys = ['sticky', 'transparentOnHero'] as const
  for (const key of boolKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    out[key] = Boolean(patch[key])
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'announcement')) {
    const merged = mergeOptionalNestedStrings(prev?.announcement, patch.announcement)
    if (merged) out.announcement = merged
    else delete out.announcement
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'navigationItems')) {
    const items = patch.navigationItems
    if (!items || items.length === 0) delete out.navigationItems
    else out.navigationItems = items
  }

  return Object.keys(out).length > 0 ? (out as z.infer<typeof headerSettingsSchema>) : undefined
}

function mergeMotionPatch(
  prev: z.infer<typeof motionSettingsSchema> | undefined,
  patch: Partial<z.infer<typeof motionSettingsSchema>> | undefined,
): z.infer<typeof motionSettingsSchema> | undefined {
  if (!patch) return prev
  const out = { ...prev, ...patch } as z.infer<typeof motionSettingsSchema>
  if (Object.keys(out).length === 0) return undefined
  return out
}

/**
 * Merge a partial PATCH into the stored document. Empty string clears a field.
 * Validates the merged result (e.g. GTM must be GTM-… or absent).
 */
export function mergeSiteSettingsDocumentPatch(
  prev: SiteSettingsDocument,
  patch: SiteSettingsPatchDocument,
): { ok: true; document: SiteSettingsDocument } | { ok: false; message: string } {
  const next: Record<string, unknown> = { ...prev }

  mergeStringFields(next, patch, STRING_PATCH_KEYS)

  if (Object.prototype.hasOwnProperty.call(patch, 'customCss')) {
    const raw = patch.customCss
    if (raw === undefined) {
      /* skip */
    } else if (raw.trim() === '') {
      delete next.customCss
    } else {
      next.customCss = raw
    }
  }

  if (patch.branding !== undefined) {
    const merged = mergeOptionalNestedStrings(prev.branding, patch.branding)
    if (merged) next.branding = merged
    else delete next.branding
  }

  if (patch.typography !== undefined) {
    const merged = mergeOptionalNestedStrings(prev.typography, patch.typography)
    if (merged) next.typography = merged
    else delete next.typography
  }

  if (patch.layout !== undefined) {
    const merged = mergeOptionalNestedStrings(prev.layout, patch.layout)
    if (merged) next.layout = merged
    else delete next.layout
  }

  if (patch.header !== undefined) {
    const merged = mergeHeaderPatch(prev.header, patch.header)
    if (merged) next.header = merged
    else delete next.header
  }

  if (patch.footer !== undefined) {
    const merged = mergeFooterPatch(prev.footer, patch.footer)
    if (merged) next.footer = merged
    else delete next.footer
  }

  if (patch.motion !== undefined) {
    const merged = mergeMotionPatch(prev.motion, patch.motion)
    if (merged) next.motion = merged
    else delete next.motion
  }

  if (patch.colors !== undefined) {
    const merged = mergeOptionalNestedStrings(prev.colors, patch.colors)
    if (merged) next.colors = merged
    else delete next.colors
  }

  if (patch.contactInfo !== undefined) {
    const merged = mergeOptionalNestedStrings(prev.contactInfo, patch.contactInfo)
    if (merged) next.contactInfo = merged
    else delete next.contactInfo
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'socialLinks')) {
    const links = patch.socialLinks
    if (!links || links.length === 0) delete next.socialLinks
    else next.socialLinks = links
  }

  const parsed = siteSettingsDocumentSchema.safeParse(next)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg = Object.values(first).flat()[0] ?? 'Invalid site settings'
    return { ok: false, message: msg }
  }
  return { ok: true, document: parsed.data }
}

export function parseSiteSettingsDocument(raw: unknown): SiteSettingsDocument {
  const parsed = siteSettingsDocumentSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : {}
}

const FALLBACK_ROOT_METADATA = {
  title: { default: 'The Modesty Argument', template: '%s — TMA' },
  description:
    'The Modesty Argument — a premium, backend-driven platform for B2B growth and conversion.',
} satisfies Metadata

export function mergeRootLayoutMetadata(site: SiteSettingsDocument | null | undefined): Metadata {
  const titleDefault =
    site?.defaultTitle?.trim() || (FALLBACK_ROOT_METADATA.title as { default: string }).default
  const titleTemplate =
    site?.titleTemplate?.trim() ||
    (FALLBACK_ROOT_METADATA.title as { template?: string }).template ||
    '%s — TMA'
  const description =
    site?.defaultDescription?.trim() || FALLBACK_ROOT_METADATA.description || undefined

  const meta: Metadata = {
    title: { default: titleDefault, template: titleTemplate },
    description,
  }

  const verify = site?.googleSiteVerification?.trim()
  if (verify) {
    meta.verification = { ...meta.verification, google: verify }
  }

  const ogUrl = site?.ogImageUrl?.trim()
  const ogAbs = ogUrl ? absoluteMediaUrl(ogUrl) : undefined
  if (ogAbs) {
    meta.openGraph = {
      ...meta.openGraph,
      title: titleDefault,
      description,
      images: [{ url: ogAbs }],
    }
  }

  const tw = site?.twitterSite?.trim()
  if (tw) {
    meta.twitter = { ...meta.twitter, site: tw }
  }

  return meta
}

export async function getPublicSiteSettingsDocument(db: CmsDb): Promise<SiteSettingsDocument | null> {
  const rows = await db.select().from(cmsSiteSettings).orderBy(asc(cmsSiteSettings.id)).limit(1)
  const row = rows[0]
  if (!row) return null
  return parseSiteSettingsDocument(row.document)
}

export async function ensureSiteSettingsRow(db: CmsDb): Promise<typeof cmsSiteSettings.$inferSelect> {
  const existing = await db.select().from(cmsSiteSettings).orderBy(asc(cmsSiteSettings.id)).limit(1)
  if (existing[0]) return existing[0]
  const inserted = await db
    .insert(cmsSiteSettings)
    .values({ document: {} })
    .returning()
  return inserted[0]!
}

export async function updateSiteSettingsDocument(
  db: CmsDb,
  document: SiteSettingsDocument,
): Promise<typeof cmsSiteSettings.$inferSelect> {
  const row = await ensureSiteSettingsRow(db)
  const now = new Date()
  await db
    .update(cmsSiteSettings)
    .set({ document: document as Record<string, unknown>, updatedAt: now })
    .where(eq(cmsSiteSettings.id, row.id))
  const again = await db.select().from(cmsSiteSettings).where(eq(cmsSiteSettings.id, row.id)).limit(1)
  return again[0]!
}

/**
 * One cached load per request for public layout + metadata.
 */
export const loadSiteSettingsForPublic = cache(async (): Promise<SiteSettingsDocument | null> => {
  const cms = tryGetCmsDb()
  if (!cms.ok) return null
  try {
    return await getPublicSiteSettingsDocument(cms.db)
  } catch {
    return null
  }
})
