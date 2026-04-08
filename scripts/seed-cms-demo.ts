/**
 * Seeds a German-first demo dataset into `tma_custom` so the public site and `/console`
 * are populated during development.
 *
 * Design rules:
 * - extend existing production tables only
 * - keep demo content deterministic and idempotent
 * - mark demo-owned rows clearly through slugs/keys or passive `seedMeta` document fields
 * - do not overwrite existing non-demo content
 */
import { config as loadEnv } from 'dotenv'
import { eq, inArray } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'

import { getCustomDb } from '../src/db/client'
import {
  cmsAbVariants,
  cmsBookingEvents,
  cmsBookingProfiles,
  cmsCaseStudies,
  cmsCrmSyncLogs,
  cmsDownloadAssets,
  cmsEmailTemplates,
  cmsFaqEntries,
  cmsFormConfigs,
  cmsIndustries,
  cmsLeads,
  cmsMedia,
  cmsPageLocalizations,
  cmsPages,
  cmsProducts,
  cmsServices,
  cmsTeamMembers,
  cmsTestimonials,
} from '../src/db/schema'
import {
  ensureSiteSettingsRow,
  mergeSiteSettingsDocumentPatch,
  parseSiteSettingsDocument,
  updateSiteSettingsDocument,
  type SiteSettingsPatchDocument,
} from '../src/lib/siteSettings'
import type { Media } from '../src/types/cms'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(projectRoot, '.env') })

type CustomDb = NonNullable<ReturnType<typeof getCustomDb>>
type MediaRow = typeof cmsMedia.$inferSelect

const force = process.argv.includes('--force')
const DEMO_OWNER = 'cms-demo-seed'
const DEMO_VERSION = 2

const CORE_PAGE_SLUGS = ['home', 'about', 'services', 'work', 'projects', 'news', 'contact', 'thanks', 'legal'] as const
const DEMO_PAGE_SLUGS = [
  ...CORE_PAGE_SLUGS,
  'creative-tech-with-clarity',
  'design-systems-not-silos',
  'storytelling-for-digital-relevance',
  'demo-ai-positioning',
  'demo-demand-systems',
  'demo-revops-instrumentation',
  'demo-gtm-audit',
  'demo-trust-conversion',
  'demo-founder-message-lab',
] as const
const DEMO_PRODUCT_SLUGS = [
  'demo-ai-positioning-sprint',
  'demo-pipeline-audit',
  'demo-trust-conversion-kit',
  'signal-atelier',
  'atlas-os',
  'luma-editorial-engine',
] as const
const DEMO_FORM_TYPES = [
  'demo-contact',
  'demo-discovery',
  'demo-audit',
  'demo-product-inquiry',
] as const
const DEMO_BOOKING_SLUGS = ['demo-strategy-call', 'demo-leadership-briefing'] as const
const DEMO_SERVICE_SLUGS = [
  'demo-ai-positioning',
  'demo-demand-systems',
  'demo-revops-instrumentation',
] as const
const DEMO_INDUSTRY_SLUGS = [
  'demo-ai-platforms',
  'demo-regulated-saas',
  'demo-developer-tools',
] as const
const DEMO_LEAD_EMAILS = [
  'maria@demo.tma.test',
  'jonas@demo.tma.test',
  'elena@demo.tma.test',
] as const

function nowIso() {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isDemoManagedDocument(value: unknown): boolean {
  if (!isRecord(value)) return false
  const meta = value.seedMeta
  return isRecord(meta) && meta.owner === DEMO_OWNER
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function embedPageLocalization(
  base: Record<string, unknown>,
  en: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!en) return base
  const next = deepClone(base)
  const existing =
    isRecord(next.localizations) ? ({ ...next.localizations } as Record<string, unknown>) : {}
  existing.en = deepClone(en)
  next.localizations = existing
  return next
}

function demoSeedMeta(kind: string, extra?: Record<string, unknown>) {
  return {
    seedMeta: {
      owner: DEMO_OWNER,
      version: DEMO_VERSION,
      kind,
      demo: true,
      replaceBeforeProduction: true,
      sourceLocale: 'de',
      targetLocales: ['en'],
      aiReady: {
        copyPrompt:
          'Premium AI and growth platform copy for skeptical B2B buyers. Clear proof, no hype.',
        imagePrompt:
          'Editorial placeholder artwork with structural grids, lime accents, and premium motion cues.',
        faqPrompt:
          'Common objections about AI positioning, demand, RevOps, proof, procurement, and booking readiness.',
      },
      ...(extra ?? {}),
    },
  }
}

function mediaUrl(storageKey: string): string {
  return `/${storageKey.replace(/^\//, '')}`
}

function mediaShapeFromRow(row: MediaRow): Media {
  const t = row.createdAt.toISOString()
  return {
    id: row.id,
    alt: row.alt ?? '',
    url: mediaUrl(row.storageKey),
    filename: row.filename,
    mimeType: row.mimeType ?? undefined,
    filesize: row.byteSize ?? undefined,
    createdAt: t,
    updatedAt: t,
  }
}

async function maybeDeleteDemoRows(db: CustomDb): Promise<void> {
  if (!force) return

  const leadRows = await db
    .select({ id: cmsLeads.id })
    .from(cmsLeads)
    .where(inArray(cmsLeads.email, [...DEMO_LEAD_EMAILS]))
  const leadIds = leadRows.map((row) => row.id)
  if (leadIds.length > 0) {
    await db.delete(cmsBookingEvents).where(inArray(cmsBookingEvents.leadId, leadIds))
    await db.delete(cmsCrmSyncLogs).where(inArray(cmsCrmSyncLogs.leadId, leadIds))
    await db.delete(cmsLeads).where(inArray(cmsLeads.id, leadIds))
  }

  await db.delete(cmsBookingProfiles).where(inArray(cmsBookingProfiles.internalSlug, [...DEMO_BOOKING_SLUGS]))
  await db.delete(cmsFormConfigs).where(inArray(cmsFormConfigs.formType, [...DEMO_FORM_TYPES]))
  await db.delete(cmsProducts).where(inArray(cmsProducts.slug, [...DEMO_PRODUCT_SLUGS]))
  await db.delete(cmsServices).where(inArray(cmsServices.slug, [...DEMO_SERVICE_SLUGS]))
  await db.delete(cmsIndustries).where(inArray(cmsIndustries.slug, [...DEMO_INDUSTRY_SLUGS]))
  await db.delete(cmsCaseStudies).where(
    inArray(cmsCaseStudies.slug, ['demo-atlas-reset', 'demo-helix-demand', 'demo-northgate-trust']),
  )

  const downloadRows = await db
    .select({ id: cmsDownloadAssets.id })
    .from(cmsDownloadAssets)
    .where(eq(cmsDownloadAssets.fileUrl, '/demo/downloads/tma-demo-scorecard.txt'))
  if (downloadRows[0]) {
    await db.delete(cmsDownloadAssets).where(eq(cmsDownloadAssets.id, downloadRows[0].id))
  }

  const faqRows = await db
    .select({ id: cmsFaqEntries.id })
    .from(cmsFaqEntries)
    .where(
      inArray(cmsFaqEntries.question, [
        'How fast should we replace this demo content?',
        'Can we keep the demo pages live while we edit?',
        'Do the sample leads sync to Zoho automatically?',
        'How should DE and EN content be replaced?',
      ]),
    )
  if (faqRows.length > 0) {
    await db.delete(cmsFaqEntries).where(inArray(cmsFaqEntries.id, faqRows.map((row) => row.id)))
  }

  const testimonialRows = await db
    .select({ id: cmsTestimonials.id })
    .from(cmsTestimonials)
    .where(
      inArray(cmsTestimonials.author, ['Elena Weiss', 'Jonas Reed', 'Sarah Kim']),
    )
  if (testimonialRows.length > 0) {
    await db
      .delete(cmsTestimonials)
      .where(inArray(cmsTestimonials.id, testimonialRows.map((row) => row.id)))
  }

  const teamRows = await db
    .select({ id: cmsTeamMembers.id })
    .from(cmsTeamMembers)
    .where(inArray(cmsTeamMembers.name, ['Alina Brandt', 'Daniel Noor', 'Leonie Kraft']))
  if (teamRows.length > 0) {
    await db.delete(cmsTeamMembers).where(inArray(cmsTeamMembers.id, teamRows.map((row) => row.id)))
  }

  const pageRows = await db
    .select({
      id: cmsPages.id,
      slug: cmsPages.slug,
      title: cmsPages.title,
      document: cmsPages.document,
    })
    .from(cmsPages)
    .where(inArray(cmsPages.slug, [...DEMO_PAGE_SLUGS]))

  const deletablePageIds = pageRows
    .filter((row) => {
      if ((DEMO_PAGE_SLUGS as readonly string[]).includes(row.slug) && row.slug.startsWith('demo-')) {
        return true
      }
      return row.title.startsWith('Demo ·') || isDemoManagedDocument(row.document)
    })
    .map((row) => row.id)

  if (deletablePageIds.length > 0) {
    await db.delete(cmsAbVariants).where(inArray(cmsAbVariants.pageId, deletablePageIds))
    await db
      .delete(cmsPageLocalizations)
      .where(inArray(cmsPageLocalizations.pageId, deletablePageIds))
    await db.delete(cmsPages).where(inArray(cmsPages.id, deletablePageIds))
  }
}

async function ensureMedia(db: CustomDb): Promise<Record<string, MediaRow>> {
  const defs = [
    ['demo/placeholders/logo-light.svg', 'logo-light.svg', 'The Modesty Argument logo light', 'demo/brand'],
    ['demo/placeholders/logo-dark.svg', 'logo-dark.svg', 'The Modesty Argument logo dark', 'demo/brand'],
    ['demo/placeholders/logo-atlas.svg', 'logo-atlas.svg', 'Atlas Neural logo', 'demo/brand'],
    ['demo/placeholders/logo-helix.svg', 'logo-helix.svg', 'HelixFlow logo', 'demo/brand'],
    ['demo/placeholders/logo-north.svg', 'logo-north.svg', 'Northgate Grid logo', 'demo/brand'],
    ['demo/placeholders/hero-foundation.svg', 'hero-foundation.svg', 'Homepage hero visual', 'demo/pages'],
    ['demo/placeholders/service-positioning.svg', 'service-positioning.svg', 'Creative-tech positioning visual', 'demo/pages'],
    ['demo/placeholders/service-demand.svg', 'service-demand.svg', 'Demand systems visual', 'demo/pages'],
    ['demo/placeholders/service-revops.svg', 'service-revops.svg', 'RevOps systems visual', 'demo/pages'],
    ['demo/placeholders/product-sprint.svg', 'product-sprint.svg', 'Project sprint visual', 'demo/products'],
    ['demo/placeholders/product-audit.svg', 'product-audit.svg', 'Audit visual', 'demo/products'],
    ['demo/placeholders/product-conversion.svg', 'product-conversion.svg', 'Trust conversion visual', 'demo/products'],
    ['demo/placeholders/avatar-alina.svg', 'avatar-alina.svg', 'Portrait of Alina', 'demo/people'],
    ['demo/placeholders/avatar-daniel.svg', 'avatar-daniel.svg', 'Portrait of Daniel', 'demo/people'],
    ['demo/placeholders/avatar-leonie.svg', 'avatar-leonie.svg', 'Portrait of Leonie', 'demo/people'],
    ['demo/placeholders/video-poster.svg', 'video-poster.svg', 'Editorial video poster', 'demo/video'],
  ] as const

  const out: Record<string, MediaRow> = {}
  for (const [storageKey, filename, alt, folder] of defs) {
    const existing = await db
      .select()
      .from(cmsMedia)
      .where(eq(cmsMedia.storageKey, storageKey))
      .limit(1)
    if (existing[0]) {
      if (
        existing[0].filename !== filename ||
        existing[0].alt !== alt ||
        existing[0].folder !== folder
      ) {
        const [updated] = await db
          .update(cmsMedia)
          .set({
            filename,
            alt,
            folder,
          })
          .where(eq(cmsMedia.id, existing[0].id))
          .returning()
        out[storageKey] = updated!
      } else {
        out[storageKey] = existing[0]
      }
      continue
    }
    const [row] = await db
      .insert(cmsMedia)
      .values({
        storageKey,
        filename,
        alt,
        mimeType: 'image/svg+xml',
        byteSize: null,
        folder,
      })
      .returning()
    out[storageKey] = row!
  }
  return out
}

async function ensureEmailTemplate(
  db: CustomDb,
  key: string,
  language: 'de' | 'en',
  subject: string,
  htmlBody: string,
  variablesJson: string[],
): Promise<number> {
  const rows = await db
    .select({ id: cmsEmailTemplates.id, language: cmsEmailTemplates.language })
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.key, key))
  const exactRow = rows.find((row) => row.language === language)
  if (exactRow) {
    await db
      .update(cmsEmailTemplates)
      .set({
        subject,
        htmlBody,
        variablesJson,
        active: true,
      })
      .where(eq(cmsEmailTemplates.id, exactRow.id))
    return exactRow.id
  }

  const [inserted] = await db
    .insert(cmsEmailTemplates)
    .values({
      key,
      language,
      subject,
      htmlBody,
      variablesJson,
      active: true,
    })
    .returning({ id: cmsEmailTemplates.id })
  return inserted!.id
}

async function ensureEmailTemplates(db: CustomDb) {
  const leadVars = ['firstName', 'lastName', 'name', 'email', 'phone', 'company', 'website', 'sourcePageSlug', 'message', 'service']
  const bookingVars = ['firstName', 'bookingProfileName', 'scheduledFor', 'slotEnd', 'durationMinutes']
  const bookingCancellationVars = ['firstName', 'bookingProfileName', 'scheduledFor', 'reason']

  const leadUserDe = await ensureEmailTemplate(
    db,
    'lead_user_confirmation',
    'de',
    'Danke {{firstName}} - wir haben Ihre Anfrage erhalten',
    `<p>Hallo {{firstName}},</p><p>danke fur Ihre Nachricht. Ihre Anfrage wurde erfolgreich gespeichert.</p><p>Wir melden uns mit dem nachsten sinnvollen Schritt fur {{company}}.</p><p>- The Modesty Argument</p>`,
    leadVars,
  )
  await ensureEmailTemplate(
    db,
    'lead_user_confirmation',
    'en',
    'Thanks {{firstName}} - we received your inquiry',
    `<p>Hi {{firstName}},</p><p>thanks for reaching out. Your inquiry has been received successfully.</p><p>We will follow up with the next best step for {{company}}.</p><p>- The Modesty Argument</p>`,
    leadVars,
  )
  await ensureEmailTemplate(
    db,
    'lead_admin_notification',
    'de',
    'Neue Anfrage von {{name}}',
    `<p>Neue Anfrage fur das interne Team.</p><p><strong>Name:</strong> {{name}}<br/><strong>Email:</strong> {{email}}<br/><strong>Firma:</strong> {{company}}<br/><strong>Service:</strong> {{service}}<br/><strong>Seite:</strong> {{sourcePageSlug}}</p>`,
    leadVars,
  )
  await ensureEmailTemplate(
    db,
    'lead_admin_notification',
    'en',
    'New lead from {{name}}',
    `<p>A new inquiry was captured.</p><p><strong>Name:</strong> {{name}}<br/><strong>Email:</strong> {{email}}<br/><strong>Company:</strong> {{company}}<br/><strong>Service:</strong> {{service}}<br/><strong>Page:</strong> {{sourcePageSlug}}</p>`,
    leadVars,
  )
  await ensureEmailTemplate(
    db,
    'booking_confirmation',
    'de',
    'Buchungsbestatigung: {{bookingProfileName}} am {{scheduledFor}}',
    `<p>Hallo {{firstName}},</p><p>Ihr Termin ist bestatigt.</p><p><strong>Termin:</strong> {{scheduledFor}}<br/><strong>Dauer:</strong> {{durationMinutes}} Minuten</p><p>- The Modesty Argument</p>`,
    bookingVars,
  )
  await ensureEmailTemplate(
    db,
    'booking_confirmation',
    'en',
    'Booking confirmed: {{bookingProfileName}} on {{scheduledFor}}',
    `<p>Hi {{firstName}},</p><p>your booking is confirmed.</p><p><strong>Start:</strong> {{scheduledFor}}<br/><strong>Duration:</strong> {{durationMinutes}} minutes</p><p>- The Modesty Argument</p>`,
    bookingVars,
  )
  await ensureEmailTemplate(
    db,
    'booking-cancellation',
    'de',
    'Termin abgesagt: {{bookingProfileName}} am {{scheduledFor}}',
    `<p>Hallo {{firstName}},</p><p>Ihr Termin wurde abgesagt.</p><p><strong>Termin:</strong> {{scheduledFor}}<br/><strong>Profil:</strong> {{bookingProfileName}}</p><p>{{reason}}</p><p>Wenn Sie einen neuen Termin brauchen, antworten Sie einfach auf diese E-Mail.</p><p>- The Modesty Argument</p>`,
    bookingCancellationVars,
  )
  await ensureEmailTemplate(
    db,
    'booking-cancellation',
    'en',
    'Booking cancelled: {{bookingProfileName}} on {{scheduledFor}}',
    `<p>Hi {{firstName}},</p><p>your booking has been cancelled.</p><p><strong>Scheduled for:</strong> {{scheduledFor}}<br/><strong>Profile:</strong> {{bookingProfileName}}</p><p>{{reason}}</p><p>If you need a new time, just reply to this email.</p><p>- The Modesty Argument</p>`,
    bookingCancellationVars,
  )

  return { leadUserDe }
}

async function ensureServices(db: CustomDb) {
  const defs = [
    {
      slug: 'demo-ai-positioning',
      name: 'AI Positioning',
      summary: 'Service record for positioning, proof, and narrative.',
      promise: 'Adapt this placeholder service to your real offer structure.',
    },
    {
      slug: 'demo-demand-systems',
      name: 'Demand Systems',
      summary: 'Service record for paid, organic, and conversion paths.',
      promise: 'Adapt this structure to your campaign and pipeline operating model.',
    },
    {
      slug: 'demo-revops-instrumentation',
      name: 'RevOps Instrumentation',
      summary: 'Service record for funnel instrumentation and handoff design.',
      promise: 'Adapt this structure to your attribution and workflow scope.',
    },
  ] as const

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsServices.id })
      .from(cmsServices)
      .where(eq(cmsServices.slug, def.slug))
      .limit(1)
    if (existing[0]) {
      out[def.slug] = existing[0].id
      await db
        .update(cmsServices)
        .set({
          name: def.name,
          summary: def.summary,
          promise: def.promise,
          proof: demoSeedMeta('service', { slug: def.slug }),
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsServices.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsServices)
      .values({
        slug: def.slug,
        name: def.name,
        summary: def.summary,
        promise: def.promise,
        proof: demoSeedMeta('service', { slug: def.slug }),
        active: true,
      })
      .returning({ id: cmsServices.id })
    out[def.slug] = row!.id
  }
  return out
}

async function ensureIndustries(db: CustomDb) {
  const defs = [
    {
      slug: 'demo-ai-platforms',
      name: 'AI Platforms',
      summary: 'Industry record for AI-native B2B products.',
      messaging: { angle: 'Proof-first narrative for skeptical buying committees.' },
    },
    {
      slug: 'demo-regulated-saas',
      name: 'Regulated SaaS',
      summary: 'Industry record for trust-heavy sales motions.',
      messaging: { angle: 'Security, compliance, and ROI must sit in the same story.' },
    },
    {
      slug: 'demo-developer-tools',
      name: 'Developer Tools',
      summary: 'Industry record for product-led and sales-assisted developer-tool motions.',
      messaging: { angle: 'Docs, proof, and pricing need to agree with live sales calls.' },
    },
  ] as const

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsIndustries.id })
      .from(cmsIndustries)
      .where(eq(cmsIndustries.slug, def.slug))
      .limit(1)
    if (existing[0]) {
      out[def.slug] = existing[0].id
      await db
        .update(cmsIndustries)
        .set({
          name: def.name,
          summary: def.summary,
          messaging: def.messaging,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsIndustries.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsIndustries)
      .values({
        slug: def.slug,
        name: def.name,
        summary: def.summary,
        messaging: def.messaging,
        active: true,
      })
      .returning({ id: cmsIndustries.id })
    out[def.slug] = row!.id
  }
  return out
}

async function ensureTestimonials(db: CustomDb, media: Record<string, MediaRow>) {
  const defs = [
    {
      author: 'Elena Weiss',
      role: 'VP Marketing',
      company: 'Atlas Neural',
      quote:
        'We used the seeded page structure as a real working outline. The team could replace copy quickly without rethinking the whole site.',
      photoMediaId: media['demo/placeholders/avatar-alina.svg']!.id,
    },
    {
      author: 'Jonas Reed',
      role: 'Founder',
      company: 'HelixFlow',
      quote:
        'The booking, landing, and lead records made it easier to QA our real funnel before launch.',
      photoMediaId: media['demo/placeholders/avatar-daniel.svg']!.id,
    },
    {
      author: 'Sarah Kim',
      role: 'Growth Lead',
      company: 'Northgate Grid',
      quote:
        'Seeing German-first pages with English overlays helped us spot translation gaps before we added live content.',
      photoMediaId: media['demo/placeholders/avatar-leonie.svg']!.id,
    },
  ] as const

  const out: number[] = []
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsTestimonials.id })
      .from(cmsTestimonials)
      .where(eq(cmsTestimonials.author, def.author))
      .limit(1)
    if (existing[0]) {
      out.push(existing[0].id)
      await db
        .update(cmsTestimonials)
        .set({
          quote: def.quote,
          role: def.role,
          company: def.company,
          photoMediaId: def.photoMediaId,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsTestimonials.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsTestimonials)
      .values({
        quote: def.quote,
        author: def.author,
        role: def.role,
        company: def.company,
        photoMediaId: def.photoMediaId,
        active: true,
      })
      .returning({ id: cmsTestimonials.id })
    out.push(row!.id)
  }
  return out
}

async function ensureFaqEntries(db: CustomDb) {
  const defs = [
    {
      question: 'How quickly can we adapt this starter content?',
      answer:
        'Start with the homepage, forms, booking CTAs, products, and legal copy. The seed makes the system usable immediately, but the public copy should still be adapted.',
      sortOrder: 10,
    },
    {
      question: 'Can we keep these pages live while we edit?',
      answer:
        'Yes. Use draft status for replacement pages or edit the seeded rows directly. The structure is already wired into the public renderer.',
      sortOrder: 20,
    },
    {
      question: 'Do the sample leads sync to Zoho automatically?',
      answer:
        'Only if Zoho auto-sync is enabled in this environment. Seeded leads are stored in PostgreSQL first and are safe to remove later.',
      sortOrder: 30,
    },
    {
      question: 'How should DE and EN content be replaced?',
      answer:
        'Treat German as the source copy, then update English through localization rows or localized document overlays where the module supports them.',
      sortOrder: 40,
    },
  ] as const

  const out: number[] = []
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsFaqEntries.id })
      .from(cmsFaqEntries)
      .where(eq(cmsFaqEntries.question, def.question))
      .limit(1)
    if (existing[0]) {
      out.push(existing[0].id)
      await db
        .update(cmsFaqEntries)
        .set({
          answer: def.answer,
          sortOrder: def.sortOrder,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsFaqEntries.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsFaqEntries)
      .values({
        question: def.question,
        answer: def.answer,
        sortOrder: def.sortOrder,
        active: true,
      })
      .returning({ id: cmsFaqEntries.id })
    out.push(row!.id)
  }
  return out
}

async function ensureTeam(db: CustomDb, media: Record<string, MediaRow>) {
  const defs = [
    {
      key: 'alina-brandt',
      name: 'Alina Brandt',
      role: 'Creative Direction',
      bio: null,
      photoMediaId: media['demo/placeholders/avatar-alina.svg']!.id,
      sortOrder: 10,
      linkedinUrl: 'https://www.linkedin.com/company/openai',
    },
    {
      key: 'daniel-noor',
      name: 'Daniel Noor',
      role: 'Design Systems & UX',
      bio: null,
      photoMediaId: media['demo/placeholders/avatar-daniel.svg']!.id,
      sortOrder: 20,
      linkedinUrl: 'https://www.linkedin.com/company/openai',
    },
    {
      key: 'leonie-kraft',
      name: 'Leonie Kraft',
      role: 'Product Engineering',
      bio: null,
      photoMediaId: media['demo/placeholders/avatar-leonie.svg']!.id,
      sortOrder: 30,
      linkedinUrl: 'https://www.linkedin.com/company/openai',
    },
  ] as const

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsTeamMembers.id })
      .from(cmsTeamMembers)
      .where(eq(cmsTeamMembers.name, def.name))
      .limit(1)
    if (existing[0]) {
      out[def.key] = existing[0].id
      await db
        .update(cmsTeamMembers)
        .set({
          role: def.role,
          bio: def.bio,
          photoMediaId: def.photoMediaId,
          sortOrder: def.sortOrder,
          linkedinUrl: def.linkedinUrl,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsTeamMembers.id, existing[0].id))
      continue
    }
    const [row] = await db.insert(cmsTeamMembers).values({
      name: def.name,
      role: def.role,
      bio: def.bio,
      photoMediaId: def.photoMediaId,
      sortOrder: def.sortOrder,
      linkedinUrl: def.linkedinUrl,
      active: true,
    }).returning({ id: cmsTeamMembers.id })
    out[def.key] = row!.id
  }
  return out
}

async function ensureDownloadAsset(db: CustomDb) {
  const existing = await db
    .select({ id: cmsDownloadAssets.id })
    .from(cmsDownloadAssets)
    .where(eq(cmsDownloadAssets.fileUrl, '/demo/downloads/tma-demo-scorecard.txt'))
    .limit(1)
  if (existing[0]) {
    await db
      .update(cmsDownloadAssets)
      .set({
        title: 'Content Replacement Scorecard',
        description: 'Plain-text placeholder download showing how seeded assets can be swapped safely.',
        fileLabel: 'Download checklist',
        active: true,
      })
      .where(eq(cmsDownloadAssets.id, existing[0].id))
    return existing[0].id
  }

  const [row] = await db
    .insert(cmsDownloadAssets)
    .values({
      title: 'Content Replacement Scorecard',
      description: 'Plain-text placeholder download showing how seeded assets can be swapped safely.',
      fileUrl: '/demo/downloads/tma-demo-scorecard.txt',
      fileLabel: 'Download checklist',
      active: true,
    })
    .returning({ id: cmsDownloadAssets.id })
  return row!.id
}

async function ensureCaseStudies(
  db: CustomDb,
  _industries: Record<string, number>,
  media: Record<string, MediaRow>,
) {
  const defs = [
    {
      slug: 'demo-atlas-reset',
      title: 'AURELIA',
      summary: 'Markensystem, editoriale Website und bewegte Launch-Assets fur einen klaren digitalen Auftritt.',
      industryId: null,
      featuredImageId: media['demo/placeholders/product-sprint.svg']!.id,
    },
    {
      slug: 'demo-helix-demand',
      title: 'MOTION ATLAS',
      summary: 'Interaktive Produktstory, modulare CMS-Struktur und Launch-Narrativ fur eine moderne digitale Plattform.',
      industryId: null,
      featuredImageId: media['demo/placeholders/service-demand.svg']!.id,
    },
    {
      slug: 'demo-northgate-trust',
      title: 'LUMA CITY',
      summary: 'Kampagnenwelt, Content-Richtung und immersive digitale Touchpoints mit starker visueller Koharenz.',
      industryId: null,
      featuredImageId: media['demo/placeholders/product-conversion.svg']!.id,
    },
  ] as const

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsCaseStudies.id })
      .from(cmsCaseStudies)
      .where(eq(cmsCaseStudies.slug, def.slug))
      .limit(1)
    if (existing[0]) {
      out[def.slug] = existing[0].id
      await db
        .update(cmsCaseStudies)
        .set({
          title: def.title,
          summary: def.summary,
          industryId: def.industryId,
          featuredImageId: def.featuredImageId,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsCaseStudies.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsCaseStudies)
      .values({
        title: def.title,
        slug: def.slug,
        summary: def.summary,
        industryId: def.industryId,
        featuredImageId: def.featuredImageId,
        active: true,
      })
      .returning({ id: cmsCaseStudies.id })
    out[def.slug] = row!.id
  }
  return out
}

async function ensureFormConfigs(db: CustomDb) {
  const defs: Array<{
    formType: (typeof DEMO_FORM_TYPES)[number]
    document: Record<string, unknown>
  }> = [
    {
      formType: 'demo-contact',
      document: {
        ...demoSeedMeta('form', { formType: 'demo-contact' }),
        name: 'Projektanfrage',
        intro:
          'Teilen Sie uns kurz mit, worum es geht. Wir melden uns mit einem klaren nachsten Schritt fur Ihr Vorhaben.',
        submitLabel: 'Projekt anfragen',
        successMessage:
          'Danke. Ihre Anfrage ist eingegangen. Wir melden uns zeitnah zuruck.',
        fields: [
          {
            name: 'firstName',
            type: 'text',
            label: 'Name',
            required: true,
            placeholder: 'Wie durfen wir Sie ansprechen?',
            width: 'full',
          },
          {
            name: 'email',
            type: 'email',
            label: 'E-Mail',
            required: true,
            placeholder: 'name@unternehmen.de',
            width: 'half',
          },
          {
            name: 'company',
            type: 'text',
            label: 'Unternehmen',
            required: false,
            placeholder: 'Unternehmen oder Organisation',
            width: 'half',
          },
          {
            name: 'serviceInterest',
            type: 'text',
            label: 'Leistungsbereich',
            required: false,
            placeholder: 'z. B. Branding, Website, App, UX',
            width: 'half',
          },
          {
            name: 'budgetRange',
            type: 'text',
            label: 'Budgetrahmen',
            required: false,
            placeholder: 'Optional',
            width: 'half',
          },
          {
            name: 'timeline',
            type: 'text',
            label: 'Zeithorizont',
            required: false,
            placeholder: 'Optional',
            width: 'half',
          },
          {
            name: 'message',
            type: 'textarea',
            label: 'Projektanliegen / Nachricht',
            required: true,
            placeholder: 'Worum geht es, und was ist fur den nachsten Schritt wichtig?',
            helperText: 'Je klarer der Kontext, desto gezielter konnen wir reagieren.',
            width: 'full',
          },
        ],
        destination: { notifyEmails: [] },
        autoresponderTemplate: { key: 'lead_user_confirmation' },
        spamProtection: { requireCaptcha: false },
        consent: {
          enabled: true,
          label: 'Ich bin mit einer gelegentlichen Kontaktaufnahme zu diesem Anliegen einverstanden (optional)',
          required: false,
        },
        layout: { width: 'default', columns: 2 },
        localizations: {
          en: {
            name: 'Project inquiry',
            intro:
              'Tell us a little about your project. We will come back with a clear next step.',
            submitLabel: 'Start project inquiry',
            successMessage:
              'Thank you. Your inquiry has been received and we will reply shortly.',
            fields: [
              {
                name: 'firstName',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'How should we address you?',
                width: 'full',
              },
              {
                name: 'email',
                type: 'email',
                label: 'Email',
                required: true,
                placeholder: 'name@company.com',
                width: 'half',
              },
              {
                name: 'company',
                type: 'text',
                label: 'Company',
                required: false,
                placeholder: 'Company or organisation',
                width: 'half',
              },
              {
                name: 'serviceInterest',
                type: 'text',
                label: 'Area of interest',
                required: false,
                placeholder: 'e.g. branding, website, app, UX',
                width: 'half',
              },
              {
                name: 'budgetRange',
                type: 'text',
                label: 'Budget range',
                required: false,
                placeholder: 'Optional',
                width: 'half',
              },
              {
                name: 'timeline',
                type: 'text',
                label: 'Timeline',
                required: false,
                placeholder: 'Optional',
                width: 'half',
              },
              {
                name: 'message',
                type: 'textarea',
                label: 'Project brief / message',
                required: true,
                placeholder: 'What should we know before we reply?',
                helperText: 'The clearer the context, the more targeted our response can be.',
                width: 'full',
              },
            ],
            consent: {
              enabled: true,
              label: 'I am comfortable with occasional follow-up about this inquiry (optional)',
              required: false,
            },
          },
        },
      },
    },
    {
      formType: 'demo-discovery',
      document: {
        ...demoSeedMeta('form', { formType: 'demo-discovery' }),
        name: 'Discovery Formular',
        intro: 'Ideal fur Landingpages mit Qualifizierung vor dem ersten Gesprach.',
        submitLabel: 'Discovery starten',
        successMessage: 'Danke. Wir haben deinen Discovery-Kontext gespeichert.',
        fields: [
          { name: 'firstName', type: 'text', label: 'Vorname', required: true, placeholder: '', width: 'half' },
          { name: 'email', type: 'email', label: 'E-Mail', required: true, placeholder: '', width: 'half' },
          { name: 'company', type: 'text', label: 'Firma', required: true, placeholder: '', width: 'half' },
          { name: 'website', type: 'url', label: 'Website', required: false, placeholder: 'https://', width: 'half' },
          { name: 'goal', type: 'textarea', label: 'Ziel in 90 Tagen', required: true, placeholder: '', width: 'full' },
        ],
        destination: { notifyEmails: [] },
        autoresponderTemplate: { key: 'lead_user_confirmation' },
        spamProtection: { requireCaptcha: false },
        consent: { enabled: true, label: 'Folgeinformationen sind in Ordnung', required: false },
        layout: { width: 'wide', columns: 2 },
        localizations: {
          en: {
            name: 'Discovery form',
            intro: 'Best for landing pages that qualify leads before the first call.',
            submitLabel: 'Start discovery',
            successMessage: 'Thanks. We captured your discovery context.',
            fields: [
              { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', width: 'half' },
              { name: 'email', type: 'email', label: 'Email', required: true, placeholder: '', width: 'half' },
              { name: 'company', type: 'text', label: 'Company', required: true, placeholder: '', width: 'half' },
              { name: 'website', type: 'url', label: 'Website', required: false, placeholder: 'https://', width: 'half' },
              { name: 'goal', type: 'textarea', label: 'Primary goal in the next 90 days', required: true, placeholder: '', width: 'full' },
            ],
            consent: { enabled: true, label: 'Follow-up information is fine', required: false },
          },
        },
      },
    },
    {
      formType: 'demo-audit',
      document: {
        ...demoSeedMeta('form', { formType: 'demo-audit' }),
        name: 'Audit Formular',
        intro: 'Fur Audit- oder teardown-orientierte Kampagnen mit klarer Scope-Abfrage.',
        submitLabel: 'Audit anfordern',
        successMessage: 'Danke. Wir haben deinen Audit-Wunsch aufgenommen.',
        fields: [
          { name: 'firstName', type: 'text', label: 'Vorname', required: true, placeholder: '', width: 'half' },
          { name: 'email', type: 'email', label: 'Work E-Mail', required: true, placeholder: '', width: 'half' },
          { name: 'company', type: 'text', label: 'Firma', required: true, placeholder: '', width: 'half' },
          { name: 'website', type: 'url', label: 'Website', required: true, placeholder: 'https://', width: 'half' },
          { name: 'scope', type: 'textarea', label: 'Welche Funnel-Stufe sollen wir auditieren?', required: true, placeholder: '', width: 'full' },
        ],
        destination: { notifyEmails: [] },
        autoresponderTemplate: { key: 'lead_user_confirmation' },
        spamProtection: { requireCaptcha: false },
        consent: { enabled: true, label: 'Ich bin mit einer Ruckfrage einverstanden', required: false },
        layout: { width: 'wide', columns: 2 },
        localizations: {
          en: {
            name: 'Audit form',
            intro: 'For teardown and audit campaigns with a clearer scope prompt.',
            submitLabel: 'Request audit',
            successMessage: 'Thanks. Your audit request is saved.',
            fields: [
              { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', width: 'half' },
              { name: 'email', type: 'email', label: 'Work email', required: true, placeholder: '', width: 'half' },
              { name: 'company', type: 'text', label: 'Company', required: true, placeholder: '', width: 'half' },
              { name: 'website', type: 'url', label: 'Website', required: true, placeholder: 'https://', width: 'half' },
              { name: 'scope', type: 'textarea', label: 'Which funnel stage should we audit?', required: true, placeholder: '', width: 'full' },
            ],
            consent: { enabled: true, label: 'I am open to a follow-up question', required: false },
          },
        },
      },
    },
    {
      formType: 'demo-product-inquiry',
      document: {
        ...demoSeedMeta('form', { formType: 'demo-product-inquiry' }),
        name: 'Produktanfrage',
        intro: 'Formular fur Produktseiten und Angebotsdetails.',
        submitLabel: 'Produkt anfragen',
        successMessage: 'Danke. Wir haben deine Produktanfrage gespeichert.',
        fields: [
          { name: 'firstName', type: 'text', label: 'Vorname', required: true, placeholder: '', width: 'half' },
          { name: 'email', type: 'email', label: 'E-Mail', required: true, placeholder: '', width: 'half' },
          { name: 'company', type: 'text', label: 'Firma', required: false, placeholder: '', width: 'half' },
          { name: 'productName', type: 'text', label: 'Produkt oder Angebot', required: true, placeholder: '', width: 'half' },
          { name: 'message', type: 'textarea', label: 'Welche Fragen hast du?', required: true, placeholder: '', width: 'full' },
        ],
        destination: { notifyEmails: [] },
        autoresponderTemplate: { key: 'lead_user_confirmation' },
        spamProtection: { requireCaptcha: false },
        consent: { enabled: true, label: 'Ich bin mit einer Kontaktaufnahme zu dieser Anfrage einverstanden', required: false },
        layout: { width: 'default', columns: 2 },
        localizations: {
          en: {
            name: 'Product inquiry',
            intro: 'Form for product and offer pages.',
            submitLabel: 'Ask about this product',
            successMessage: 'Thanks. Your product inquiry is saved.',
            fields: [
              { name: 'firstName', type: 'text', label: 'First name', required: true, placeholder: '', width: 'half' },
              { name: 'email', type: 'email', label: 'Email', required: true, placeholder: '', width: 'half' },
              { name: 'company', type: 'text', label: 'Company', required: false, placeholder: '', width: 'half' },
              { name: 'productName', type: 'text', label: 'Product or offer', required: true, placeholder: '', width: 'half' },
              { name: 'message', type: 'textarea', label: 'What are you evaluating?', required: true, placeholder: '', width: 'full' },
            ],
            consent: { enabled: true, label: 'A follow-up email is fine', required: false },
          },
        },
      },
    },
  ]

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsFormConfigs.id })
      .from(cmsFormConfigs)
      .where(eq(cmsFormConfigs.formType, def.formType))
      .limit(1)
    if (existing[0]) {
      out[def.formType] = existing[0].id
      await db
        .update(cmsFormConfigs)
        .set({
          active: true,
          document: def.document,
          updatedAt: new Date(),
        })
        .where(eq(cmsFormConfigs.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsFormConfigs)
      .values({
        formType: def.formType,
        active: true,
        document: def.document,
      })
      .returning({ id: cmsFormConfigs.id })
    out[def.formType] = row!.id
  }
  return out
}

async function ensureBookingProfiles(db: CustomDb) {
  const defs: Array<{
    internalSlug: (typeof DEMO_BOOKING_SLUGS)[number]
    active: boolean
    document: Record<string, unknown>
  }> = [
    {
      internalSlug: 'demo-strategy-call',
      active: true,
      document: {
        ...demoSeedMeta('booking_profile', { internalSlug: 'demo-strategy-call' }),
        name: 'Strategy Call',
        provider: 'internal',
        durationMinutes: 30,
        bookingUrl: '',
        assignedOwner: 'TMA Team',
        thankYouPageSlug: 'thanks',
        confirmationEmailTemplate: { key: 'booking_confirmation' },
        ctaLabel: 'Gesprach buchen',
        helperText: 'Nativer Buchungsablauf mit direkter Slot-Auswahl.',
        layout: { width: 'default' },
        availability: {
          slotStepMinutes: 30,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          windows: [
            { weekday: 1, startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
            { weekday: 2, startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
            { weekday: 3, startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
            { weekday: 4, startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
            { weekday: 5, startHour: 9, startMinute: 0, endHour: 14, endMinute: 0 },
          ],
        },
        tracking: { source: 'demo-seed' },
        localizations: {
          en: {
            name: 'Strategy call',
            ctaLabel: 'Book a call',
            helperText: 'Native booking profile with direct slot selection.',
          },
        },
      },
    },
    {
      internalSlug: 'demo-leadership-briefing',
      active: true,
      document: {
        ...demoSeedMeta('booking_profile', { internalSlug: 'demo-leadership-briefing' }),
        name: 'Leadership Briefing',
        provider: 'calendly',
        durationMinutes: 45,
        bookingUrl: 'https://calendly.com/demo/tma-platform-briefing',
        assignedOwner: 'TMA Leadership',
        thankYouPageSlug: 'thanks',
        confirmationEmailTemplate: null,
        ctaLabel: 'Externen Kalender offnen',
        helperText: 'Externer Fallback fur Provider-agnostische Booking-Tests.',
        layout: { width: 'default' },
        availability: {
          slotStepMinutes: 30,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          windows: [],
        },
        tracking: { source: 'demo-seed' },
        localizations: {
          en: {
            name: 'Leadership briefing',
            ctaLabel: 'Open external calendar',
            helperText: 'External fallback profile for provider-agnostic booking tests.',
          },
        },
      },
    },
  ]

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsBookingProfiles.id })
      .from(cmsBookingProfiles)
      .where(eq(cmsBookingProfiles.internalSlug, def.internalSlug))
      .limit(1)
    if (existing[0]) {
      out[def.internalSlug] = existing[0].id
      await db
        .update(cmsBookingProfiles)
        .set({
          active: def.active,
          document: def.document,
          updatedAt: new Date(),
        })
        .where(eq(cmsBookingProfiles.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsBookingProfiles)
      .values({
        internalSlug: def.internalSlug,
        active: def.active,
        document: def.document,
      })
      .returning({ id: cmsBookingProfiles.id })
    out[def.internalSlug] = row!.id
  }
  return out
}

async function ensureProducts(db: CustomDb) {
  const conceptCover = '/demo/placeholders/hero-foundation.svg'
  const systemsCover = '/demo/placeholders/service-demand.svg'
  const editorialCover = '/demo/placeholders/video-poster.svg'
  const defs = [
    {
      slug: 'demo-ai-positioning-sprint',
      name: 'AI Positioning Sprint',
      contentKind: 'product',
      publishedAt: '2026-01-12T00:00:00.000Z',
      listingPriority: null,
      showInProjectFeeds: false,
      document: {
        ...demoSeedMeta('product', { slug: 'demo-ai-positioning-sprint' }),
        tagline: 'Zwei Wochen von diffuser AI-Botschaft zu klarer Buyer Story.',
        modules: [
          { title: 'Proof map', body: 'Welche Claims bleiben, welche Claims brauchen Belege, welche Claims streichen wir ganz?' },
          { title: 'Buyer narrative', body: 'Eine Story fur Marketing, Sales, Product, und Procurement ohne widerspruchliche Sprache.' },
          { title: 'Offer framing', body: 'Klare Scope-, Pricing-, und CTA-Struktur fur Website, Landingpages, und outbound follow-up.' },
        ],
        primaryCta: { label: 'Discovery buchen', href: '/book/demo-strategy-call' },
        faqs: [
          { question: 'Ist das ein echtes Produkt?', answer: 'Es ist ein Platzhalter-Angebot, das zeigt, wie strukturierte Produktdaten im System aussehen konnen.' },
          { question: 'Was ersetzen wir zuerst?', answer: 'Tagline, Module, CTA, FAQs, Pricing, und SEO-Felder.' },
        ],
        pricing: {
          sectionTitle: 'Preisstruktur',
          intro: 'Beispielhafte Preisstruktur fur Entwicklung, QA und Admin-Durchlauf.',
          plans: [
            {
              name: 'Sprint',
              price: '4.500 EUR',
              description: 'Kompakter Messaging- und proof-first Sprint.',
              bullets: [{ text: 'Kickoff + audit' }, { text: 'Buyer narrative' }, { text: 'CTA and proof stack' }],
              ctaLabel: 'Anfrage senden',
              ctaHref: '/demo-gtm-audit',
            },
          ],
        },
        seo: {
          title: 'AI Positioning Sprint',
          description: 'Seeded product showing localized product document structure.',
        },
        localizations: {
          en: {
            tagline: 'Two weeks from vague AI claims to a sharper buyer narrative.',
            modules: [
              { title: 'Proof map', body: 'Keep the claims buyers can verify, rework the ones that need evidence, remove the ones that weaken trust.' },
              { title: 'Buyer narrative', body: 'A single story for marketing, sales, product, and procurement without conflicting language.' },
              { title: 'Offer framing', body: 'Sharper scope, pricing, and CTA structure across site, landing pages, and follow-up.' },
            ],
            primaryCta: { label: 'Book discovery', href: '/book/demo-strategy-call' },
            faqs: [
              { question: 'Is this a real product?', answer: 'It is a placeholder offer showing how structured product content can work in the platform.' },
              { question: 'What should be replaced first?', answer: 'Tagline, modules, CTA, FAQs, pricing, and SEO fields.' },
            ],
            pricing: {
              sectionTitle: 'Pricing structure',
              intro: 'Illustrative pricing only for development and QA.',
              plans: [
                {
                  name: 'Sprint',
                  price: 'EUR 4,500',
                  description: 'Compact proof-first messaging sprint.',
                  bullets: [{ text: 'Kickoff + audit' }, { text: 'Buyer narrative' }, { text: 'CTA and proof stack' }],
                  ctaLabel: 'Send inquiry',
                  ctaHref: '/demo-gtm-audit',
                },
              ],
            },
            seo: {
              title: 'AI Positioning Sprint',
              description: 'Seeded product showing localized product document structure.',
            },
          },
        },
      },
    },
    {
      slug: 'demo-pipeline-audit',
      name: 'Pipeline Audit',
      contentKind: 'product',
      publishedAt: '2026-01-13T00:00:00.000Z',
      listingPriority: null,
      showInProjectFeeds: false,
      document: {
        ...demoSeedMeta('product', { slug: 'demo-pipeline-audit' }),
        tagline: 'Audit fur Landingpages, Handoffs, und verlorene Nachfrage-Signale.',
        modules: [
          { title: 'Funnel scan', body: 'Von CTA bis Lead-Owner: welche Stufen verlieren Momentum?' },
          { title: 'Capture review', body: 'Formulare, Hidden Fields, Routing, und Follow-up Signale im aktuellen Setup.' },
          { title: 'Fix plan', body: 'Konkrete Verbesserungen fur Conversion, routing clarity, und reporting.' },
        ],
        primaryCta: { label: 'Audit ansehen', href: '/demo-gtm-audit' },
        faqs: [
          { question: 'Kann dieses Angebot fur Sales Ops genutzt werden?', answer: 'Ja. Es zeigt beispielhaft, wie Audit- und funnel-bezogene Produkte strukturiert werden konnen.' },
        ],
        pricing: {
          sectionTitle: 'Preisstruktur',
          intro: 'Beispielhafte Audit-Struktur.',
          plans: [
            {
              name: 'Audit',
              price: '2.900 EUR',
              description: 'Audit mit Priorisierung und Fix-Plan.',
              bullets: [{ text: 'Capture review' }, { text: 'Handoff notes' }, { text: 'Priority roadmap' }],
              ctaLabel: 'Audit starten',
              ctaHref: '/demo-gtm-audit',
            },
          ],
        },
        seo: {
          title: 'Pipeline Audit',
          description: 'Seeded audit product for public product and console flows.',
        },
        localizations: {
          en: {
            tagline: 'Audit the funnel, handoffs, and the demand signals you are losing.',
            modules: [
              { title: 'Funnel scan', body: 'Which stages lose momentum between CTA, form completion, ownership, and follow-up?' },
              { title: 'Capture review', body: 'Review forms, hidden fields, routing, and signal quality.' },
              { title: 'Fix plan', body: 'Concrete next actions for conversion, routing clarity, and reporting.' },
            ],
            primaryCta: { label: 'View audit page', href: '/demo-gtm-audit' },
            faqs: [
              { question: 'Can this offer be used for Sales Ops?', answer: 'Yes. It shows how audit and funnel-oriented products can be structured in the platform.' },
            ],
            pricing: {
              sectionTitle: 'Pricing structure',
              intro: 'Illustrative audit structure.',
              plans: [
                {
                  name: 'Audit',
                  price: 'EUR 2,900',
                  description: 'Audit with prioritization and fix plan.',
                  bullets: [{ text: 'Capture review' }, { text: 'Handoff notes' }, { text: 'Priority roadmap' }],
                  ctaLabel: 'Start audit',
                  ctaHref: '/demo-gtm-audit',
                },
              ],
            },
            seo: {
              title: 'Pipeline Audit',
              description: 'Seeded audit product for public product and console flows.',
            },
          },
        },
      },
    },
    {
      slug: 'demo-trust-conversion-kit',
      name: 'Trust Conversion Kit',
      contentKind: 'product',
      publishedAt: '2026-01-14T00:00:00.000Z',
      listingPriority: null,
      showInProjectFeeds: false,
      document: {
        ...demoSeedMeta('product', { slug: 'demo-trust-conversion-kit' }),
        tagline: 'Trust-first assets fur skeptische Buying Committees.',
        modules: [
          { title: 'Trust CTA set', body: 'CTAs, proof lines, FAQ structure, and objection handling for trust-heavy routes.' },
          { title: 'Comparison view', body: 'Seeded comparison structure for competing narratives or buying motions.' },
          { title: 'Follow-up prompts', body: 'Hand-off notes and prompt scaffolds for later AI-assisted follow-up.' },
        ],
        primaryCta: { label: 'Mehr ansehen', href: '/demo-trust-conversion' },
        faqs: [
          { question: 'Warum ist das fur Development hilfreich?', answer: 'Es uberspannt comparison, CTA, FAQ und Follow-up-Strukturen in einem einzigen Platzhalter-Produkt.' },
        ],
        pricing: {
          sectionTitle: 'Preisstruktur',
          intro: 'Strukturbeispiel fur trust-orientierte Produktpakete.',
          plans: [
            {
              name: 'Kit',
              price: '3.800 EUR',
              description: 'Trust-, proof-, und conversion-orientierte Lieferstruktur.',
              bullets: [{ text: 'FAQ and objection kit' }, { text: 'CTA stack' }, { text: 'Comparison table' }],
              ctaLabel: 'CTA testen',
              ctaHref: '/demo-trust-conversion',
            },
          ],
        },
        seo: {
          title: 'Trust Conversion Kit',
          description: 'Seeded trust-oriented product for placeholder conversion flows.',
        },
        localizations: {
          en: {
            tagline: 'Trust-first assets for skeptical buying committees.',
            modules: [
              { title: 'Trust CTA set', body: 'CTAs, proof lines, FAQ structure, and objection handling for trust-heavy journeys.' },
              { title: 'Comparison view', body: 'Seeded comparison structure for competing narratives or buying motions.' },
              { title: 'Follow-up prompts', body: 'Hand-off notes and prompt scaffolds for later AI-assisted follow-up.' },
            ],
            primaryCta: { label: 'See the page', href: '/demo-trust-conversion' },
            faqs: [
              { question: 'Why is this helpful during development?', answer: 'It exercises comparison, CTA, FAQ, and follow-up structures inside one placeholder product.' },
            ],
            pricing: {
              sectionTitle: 'Pricing structure',
              intro: 'Example structure for trust-oriented product packaging.',
              plans: [
                {
                  name: 'Kit',
                  price: 'EUR 3,800',
                  description: 'Trust, proof, and conversion packaging.',
                  bullets: [{ text: 'FAQ and objection kit' }, { text: 'CTA stack' }, { text: 'Comparison table' }],
                  ctaLabel: 'Try the CTA',
                  ctaHref: '/demo-trust-conversion',
                },
              ],
            },
            seo: {
              title: 'Trust Conversion Kit',
              description: 'Seeded trust-oriented product for placeholder conversion flows.',
            },
          },
        },
      },
    },
    {
      slug: 'signal-atelier',
      name: 'Signal Atelier',
      contentKind: 'project',
      publishedAt: '2026-02-10T00:00:00.000Z',
      listingPriority: 10,
      showInProjectFeeds: true,
      document: {
        ...demoSeedMeta('product', { slug: 'signal-atelier' }),
        projectType: 'Experience System',
        summary:
          'Ein modulares Experience-System für markengeführte digitale Touchpoints zwischen Storytelling, Interface und Bewegung.',
        tagline:
          'Markengeführtes Experience-System für digitale Erlebnisse mit editoriale Klarheit und technischer Präzision.',
        coverImageUrl: conceptCover,
        coverImageAlt: 'Editoriales Creative-Tech Visual für Signal Atelier',
        modules: [
          { title: 'Narrative structure', body: 'Ein modulares Story-System für Homepage, Kampagne und Produktkommunikation mit einer gemeinsamen Richtung.' },
          { title: 'Experience layer', body: 'Visuelle und motion-basierte Touchpoints, die die Marke nicht dekorieren, sondern digital übersetzen.' },
          { title: 'Scalable system', body: 'Ein strukturiertes digitales Fundament, das Teams in Design, Content und Entwicklung gemeinsam nutzen können.' },
        ],
        primaryCta: { label: 'Projekt besprechen', href: '/contact' },
        faqs: [
          { question: 'Ist das ein fertiges Produkt?', answer: 'Nein. Es ist ein kuratierter Projekt- und Systemansatz, der zeigt, wie TMA kreative Richtung und technische Umsetzung zusammenführt.' },
        ],
        seo: {
          title: 'Signal Atelier | The Modesty Argument',
          description:
            'Ein modulares Experience-System für markengeführte digitale Touchpoints zwischen Storytelling, Interface und Bewegung.',
        },
        localizations: {
          en: {
            projectType: 'Experience System',
            summary:
              'A modular experience system for brand-led digital touchpoints across storytelling, interface and motion.',
            tagline:
              'Brand-led experience system for digital work shaped by editorial clarity and technical precision.',
            coverImageUrl: conceptCover,
            coverImageAlt: 'Editorial creative-tech visual for Signal Atelier',
            modules: [
              { title: 'Narrative structure', body: 'A modular story system for homepage, campaign and product communication shaped by one clear direction.' },
              { title: 'Experience layer', body: 'Visual and motion-led touchpoints that translate the brand digitally instead of decorating it.' },
              { title: 'Scalable system', body: 'A structured digital foundation that design, content and engineering teams can use together.' },
            ],
            primaryCta: { label: 'Discuss project', href: '/contact' },
            faqs: [
              { question: 'Is this a finished product?', answer: 'No. It is a curated project and systems direction showing how TMA brings creative intent and technical execution together.' },
            ],
            seo: {
              title: 'Signal Atelier | The Modesty Argument',
              description:
                'A modular experience system for brand-led digital touchpoints across storytelling, interface and motion.',
            },
          },
        },
      },
    },
    {
      slug: 'atlas-os',
      name: 'Atlas OS',
      contentKind: 'system',
      publishedAt: '2026-02-17T00:00:00.000Z',
      listingPriority: 20,
      showInProjectFeeds: true,
      document: {
        ...demoSeedMeta('product', { slug: 'atlas-os' }),
        projectType: 'Platform Concept',
        summary:
          'Ein zukunftsorientiertes Plattformkonzept für digitale Produkte, Teams und Inhalte, die in einem klaren System zusammenarbeiten sollen.',
        tagline:
          'Plattformkonzept für digitale Produkte, interne Systeme und markengeführte Workflows.',
        coverImageUrl: systemsCover,
        coverImageAlt: 'Visual für das Plattformkonzept Atlas OS',
        modules: [
          { title: 'Product backbone', body: 'Ein stabiles konzeptionelles Fundament für Frontend, Backend, Content und operative Übergaben.' },
          { title: 'Team workflows', body: 'Digitale Systeme, die nicht nur Features liefern, sondern Zusammenarbeit, Klarheit und Erweiterbarkeit ermöglichen.' },
          { title: 'Brand-aware interfaces', body: 'Interfaces und Oberflächen, die technische Robustheit mit präziser visueller Identität verbinden.' },
        ],
        primaryCta: { label: 'System besprechen', href: '/contact' },
        faqs: [
          { question: 'Ist das ein reales SaaS-Produkt?', answer: 'Es ist ein kuratierter Plattformansatz, gedacht als Beispiel fur systemisches Produktdenken im TMA-Kontext.' },
        ],
        seo: {
          title: 'Atlas OS | The Modesty Argument',
          description:
            'Ein zukunftsorientiertes Plattformkonzept für digitale Produkte, Teams und Inhalte mit klarer technischer und gestalterischer Richtung.',
        },
        localizations: {
          en: {
            projectType: 'Platform Concept',
            summary:
              'A future-facing platform concept for digital products, teams and content that need to work together as one clear system.',
            tagline:
              'Platform concept for digital products, internal systems and brand-led workflows.',
            coverImageUrl: systemsCover,
            coverImageAlt: 'Visual for the Atlas OS platform concept',
            modules: [
              { title: 'Product backbone', body: 'A stable conceptual foundation for frontend, backend, content and operational handoffs.' },
              { title: 'Team workflows', body: 'Digital systems that support collaboration, clarity and extension instead of only shipping features.' },
              { title: 'Brand-aware interfaces', body: 'Interfaces that connect technical robustness with a precise visual identity.' },
            ],
            primaryCta: { label: 'Discuss system', href: '/contact' },
            faqs: [
              { question: 'Is this a real SaaS product?', answer: 'It is a curated platform direction intended to show system-level product thinking in the TMA context.' },
            ],
            seo: {
              title: 'Atlas OS | The Modesty Argument',
              description:
                'A future-facing platform concept for digital products, teams and content with clear technical and creative direction.',
            },
          },
        },
      },
    },
    {
      slug: 'luma-editorial-engine',
      name: 'Luma Editorial Engine',
      contentKind: 'initiative',
      publishedAt: '2026-02-24T00:00:00.000Z',
      listingPriority: 30,
      showInProjectFeeds: true,
      document: {
        ...demoSeedMeta('product', { slug: 'luma-editorial-engine' }),
        projectType: 'Editorial Digital Build',
        summary:
          'Ein editoriales Digitalprojekt für Marken, Formate und Inhalte, die Haltung, Rhythmus und eine visuelle Erzählung brauchen.',
        tagline:
          'Editoriale digitale Struktur für Inhalte, Kampagnen und markengeführte Formate mit visuellem Rhythmus.',
        coverImageUrl: editorialCover,
        coverImageAlt: 'Editoriales Visual für Luma Editorial Engine',
        modules: [
          { title: 'Content architecture', body: 'Ein System für Formate, Erzählung und redaktionelle Hierarchie statt isolierter Inhaltsbausteine.' },
          { title: 'Visual pacing', body: 'Eine digitale Dramaturgie aus Layout, Bewegung und Typografie, die Inhalte spürbar macht.' },
          { title: 'Reusable publishing logic', body: 'Strukturen, die sich für Kampagnen, Perspektiven und laufende Studio-Updates wiederverwenden lassen.' },
        ],
        primaryCta: { label: 'Projekt besprechen', href: '/contact' },
        faqs: [
          { question: 'Ist das ein CMS oder ein Formatkonzept?', answer: 'Beides. Es zeigt, wie TMA redaktionelle Systeme, Publishing-Strukturen und digitale Markenerfahrung zusammen denkt.' },
        ],
        seo: {
          title: 'Luma Editorial Engine | The Modesty Argument',
          description:
            'Ein editoriales Digitalprojekt für Marken, Formate und Inhalte mit Haltung, Rhythmus und visueller Erzählung.',
        },
        localizations: {
          en: {
            projectType: 'Editorial Digital Build',
            summary:
              'An editorial digital project for brands, formats and content that need intent, rhythm and a visual narrative.',
            tagline:
              'Editorial digital structure for content, campaigns and brand-led formats with visual rhythm.',
            coverImageUrl: editorialCover,
            coverImageAlt: 'Editorial visual for Luma Editorial Engine',
            modules: [
              { title: 'Content architecture', body: 'A system for formats, narrative and editorial hierarchy instead of isolated content fragments.' },
              { title: 'Visual pacing', body: 'A digital dramaturgy of layout, motion and typography that makes content feel intentional.' },
              { title: 'Reusable publishing logic', body: 'Structures that can be reused for campaigns, perspectives and ongoing studio updates.' },
            ],
            primaryCta: { label: 'Discuss project', href: '/contact' },
            faqs: [
              { question: 'Is this a CMS or a format concept?', answer: 'Both. It shows how TMA brings editorial systems, publishing structures and digital brand experience together.' },
            ],
            seo: {
              title: 'Luma Editorial Engine | The Modesty Argument',
              description:
                'An editorial digital project for brands, formats and content shaped by intent, rhythm and visual narrative.',
            },
          },
        },
      },
    },
  ] as const

  const out: Record<string, number> = {}
  for (const def of defs) {
    const existing = await db
      .select({ id: cmsProducts.id })
      .from(cmsProducts)
      .where(eq(cmsProducts.slug, def.slug))
      .limit(1)
    if (existing[0]) {
      out[def.slug] = existing[0].id
      await db
        .update(cmsProducts)
        .set({
          name: def.name,
          status: 'published',
          contentKind: def.contentKind,
          publishedAt: new Date(def.publishedAt),
          listingPriority: def.listingPriority,
          showInProjectFeeds: def.showInProjectFeeds,
          document: def.document,
          updatedAt: new Date(),
        })
        .where(eq(cmsProducts.id, existing[0].id))
      continue
    }
    const [row] = await db.insert(cmsProducts).values({
      slug: def.slug,
      name: def.name,
      status: 'published',
      contentKind: def.contentKind,
      publishedAt: new Date(def.publishedAt),
      listingPriority: def.listingPriority,
      showInProjectFeeds: def.showInProjectFeeds,
      document: def.document,
    }).returning({ id: cmsProducts.id })
    out[def.slug] = row!.id
  }
  return out
}

function buildPageDocuments(ctx: {
  media: Record<string, MediaRow>
  testimonials: number[]
  faqIds: number[]
  downloadAssetId: number
  formIds: Record<string, number>
  bookingIds: Record<string, number>
  caseStudyIds: Record<string, number>
  teamIds: Record<string, number>
  productIds: Record<string, number>
}) {
  const heroUrl = mediaUrl(ctx.media['demo/placeholders/hero-foundation.svg']!.storageKey)
  const positioningUrl = mediaUrl(ctx.media['demo/placeholders/service-positioning.svg']!.storageKey)
  const demandUrl = mediaUrl(ctx.media['demo/placeholders/service-demand.svg']!.storageKey)
  const revopsUrl = mediaUrl(ctx.media['demo/placeholders/service-revops.svg']!.storageKey)
  const sprintUrl = mediaUrl(ctx.media['demo/placeholders/product-sprint.svg']!.storageKey)
  const auditUrl = mediaUrl(ctx.media['demo/placeholders/product-audit.svg']!.storageKey)
  const conversionUrl = mediaUrl(ctx.media['demo/placeholders/product-conversion.svg']!.storageKey)
  const videoPosterUrl = mediaUrl(ctx.media['demo/placeholders/video-poster.svg']!.storageKey)

  const commonLocalization = {
    localizationAutomation: {
      autoQueueOnPublish: true,
      sourceLocale: 'de',
      targetLocales: ['en'],
    },
  }

  const pages: Array<{
    slug: (typeof DEMO_PAGE_SLUGS)[number]
    title: string
    pageType: string
    status: 'draft' | 'published'
    de: Record<string, unknown>
    en?: Record<string, unknown>
  }> = [
    {
      slug: 'home',
      title: 'Home · The Modesty Argument',
      pageType: 'home',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'home' }),
        seo: {
          title:
            'The Modesty Argument | Creative-Tech Studio fur Strategie, Design und Entwicklung',
          description:
            'Premium Creative-Tech Studio fur Strategie, Design, Entwicklung und Storytelling. Zukunftsfahige digitale Erlebnisse aus Munchen und Indien.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'home-hero',
            headline: 'Where Bold Modesty Inspires Your Creative Argument',
            subheadline:
              'Strategie, Design, Entwicklung und Storytelling fur zukunftsfahige digitale Erlebnisse zwischen Munchen und Indien.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            secondaryCtaLabel: 'Arbeiten ansehen',
            secondaryCtaHref: '#selected-work',
            backgroundMediaUrl: heroUrl,
            height: 'tall',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            heroEffect: 'rotating-text',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'home-intro',
            headline:
              'The Modesty Argument verbindet kreative Klarheit mit technischer Umsetzung.',
            body:
              'Wir sind ein Creative-Tech Studio fur Marken, Produkte und digitale Erfahrungen, die Haltung, Prazision und Zukunftsfahigkeit brauchen. Unsere Arbeit verbindet Strategie, Design, Entwicklung und Storytelling zu einer klaren digitalen Argumentation.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech studio visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'home-strip',
            quote: 'Where Creativity Meets Technology',
            attribution: 'The Modesty Argument',
            roleLine: 'Creative-Tech Studio',
            variant: 'border',
            revealMode: 'subtle',
          },
          {
            blockType: 'iconRow',
            id: 'home-capabilities',
            sectionTitle: 'Core Capabilities',
            intro:
              'Von Markenaufbau bis Produktentwicklung entstehen digitale Arbeiten, die strategisch gedacht und hochwertig umgesetzt sind.',
            items: [
              { id: 'cap-1', icon: '◆', title: 'Web Design', body: 'Digitale Auftritte mit Haltung, Klarheit und visueller Prazision.' },
              { id: 'cap-2', icon: '◇', title: 'App Development', body: 'Digitale Produkte und Anwendungen, die robust, schnell und markentauglich sind.' },
              { id: 'cap-3', icon: '○', title: 'Marketing', body: 'Positionierung, Kampagnen und digitale Systeme fur sichtbare Wirkung.' },
              { id: 'cap-4', icon: '✦', title: 'Content Creation', body: 'Storytelling, Inhalte und Formate, die Ideen verstandlich und begehrlich machen.' },
              { id: 'cap-5', icon: '✳', title: 'Brand Identity', body: 'Markenbilder, Systeme und Ausdruck, die Wiedererkennbarkeit schaffen.' },
              { id: 'cap-6', icon: '△', title: 'UX Design', body: 'Nutzererlebnisse, die intuitiv, klar und hochwertig wirken.' },
            ],
          },
          {
            blockType: 'servicesFocus',
            id: 'home-services',
            sectionTitle: 'Leistungen mit Fokus',
            intro:
              'Jede Leistung verbindet konzeptionelles Denken mit gestalterischer und technischer Umsetzung.',
            items: [
              {
                id: 'service-brand',
                title: 'Brand Identity',
                summary: 'Markensysteme, die Richtung geben und Wiedererkennbarkeit schaffen.',
                bullets: [
                  { id: 'service-brand-1', text: 'Markenpositionierung und Ausdruck' },
                  { id: 'service-brand-2', text: 'Visuelle Systeme und Identitat' },
                  { id: 'service-brand-3', text: 'Konsistente Markenfuhrung digital gedacht' },
                ],
                imageUrl: positioningUrl,
                imageAlt: 'Visual fur Brand Identity',
              },
              {
                id: 'service-web',
                title: 'Web Design',
                summary: 'Editoriale Websites mit Klarheit, Stimmung und digitaler Prazision.',
                bullets: [
                  { id: 'service-web-1', text: 'Editoriale und conversion-starke Websites' },
                  { id: 'service-web-2', text: 'Systemisches UI und visuelle Hierarchie' },
                  { id: 'service-web-3', text: 'CMS-fahige Strukturen fur Wachstum' },
                ],
                imageUrl: heroUrl,
                imageAlt: 'Visual fur Web Design',
              },
              {
                id: 'service-app',
                title: 'App Development',
                summary: 'Digitale Produkte, die sauber gebaut und markengerecht gestaltet sind.',
                bullets: [
                  { id: 'service-app-1', text: 'Web Apps und digitale Produktoberflachen' },
                  { id: 'service-app-2', text: 'Frontend und Backend aus einem Konzept' },
                  { id: 'service-app-3', text: 'Technisch sauber, markenkonform umgesetzt' },
                ],
                imageUrl: revopsUrl,
                imageAlt: 'Visual fur App Development',
              },
              {
                id: 'service-marketing',
                title: 'Marketing',
                summary: 'Digitale Kampagnen und Systeme, die Strategie und Kreation verbinden.',
                bullets: [
                  { id: 'service-marketing-1', text: 'Digitale Kampagnen mit klarer Erzahlung' },
                  { id: 'service-marketing-2', text: 'Performance-orientierte Touchpoints' },
                  { id: 'service-marketing-3', text: 'Strategie und Kreation im gleichen System' },
                ],
                imageUrl: demandUrl,
                imageAlt: 'Visual fur Marketing',
              },
              {
                id: 'service-content',
                title: 'Content Creation',
                summary: 'Inhalte und Formate, die Idee, Haltung und Nutzen erfahrbar machen.',
                bullets: [
                  { id: 'service-content-1', text: 'Content-Systeme statt EinzelmaBnahmen' },
                  { id: 'service-content-2', text: 'Storytelling fur Marke, Produkt und Nachfrage' },
                  { id: 'service-content-3', text: 'Copy, Visuals und Assets mit Richtung' },
                ],
                imageUrl: auditUrl,
                imageAlt: 'Visual fur Content Creation',
              },
              {
                id: 'service-ux',
                title: 'UX Design',
                summary: 'Nutzerzentrierte digitale Erlebnisse mit Klarheit und Bedeutung.',
                bullets: [
                  { id: 'service-ux-1', text: 'Strukturen, Flows und Interfaces mit Klarheit' },
                  { id: 'service-ux-2', text: 'Nutzerzentrierte digitale Erfahrungen' },
                  { id: 'service-ux-3', text: 'Weniger Reibung, mehr Bedeutung' },
                ],
                imageUrl: conversionUrl,
                imageAlt: 'Visual fur UX Design',
              },
            ],
          },
          {
            blockType: 'caseStudyGrid',
            id: 'selected-work',
            sectionTitle: 'Selected Work',
            intro:
              'Ein Blick auf ausgewahlte Arbeiten, in denen Strategie, Gestaltung und technische Umsetzung zusammenfinden.',
            studies: [
              ctx.caseStudyIds['demo-atlas-reset'],
              ctx.caseStudyIds['demo-helix-demand'],
              ctx.caseStudyIds['demo-northgate-trust'],
            ],
            ctaLabel: 'Mehr entdecken',
            ctaHref: '/work',
          },
          {
            blockType: 'textMedia',
            id: 'home-philosophy',
            headline: 'Inspiring Generations',
            body:
              'Wir glauben an digitale Arbeit, die nicht nur funktioniert, sondern Bedeutung erzeugt. The Modesty Argument verbindet Inspiration, kulturelle Sensibilitat und technologische Kompetenz, um Erlebnisse zu schaffen, die heute wirken und morgen relevant bleiben.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Studio philosophy visual',
            imagePosition: 'left',
            mediaWidth: 'wide',
            backgroundEffect: 'glow',
          },
          {
            blockType: 'promoBanner',
            id: 'home-final-cta',
            eyebrow: 'Lassen Sie uns etwas Relevantes bauen',
            headline: 'Bereit fur ein Projekt mit Haltung, Prazision und Zukunft?',
            body:
              'Wenn Strategie, Design und Entwicklung zusammen gedacht werden sollen, sprechen wir gern uber Ihr nachstes digitales Vorhaben.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
          {
            blockType: 'stickyCta',
            label: 'Projekt starten',
            href: '/contact',
            variant: 'primary',
          },
        ],
      },
      en: {
        seo: {
          title:
            'The Modesty Argument | Creative-tech studio for strategy, design and development',
          description:
            'Premium creative-tech studio for strategy, design, development and storytelling. Future-facing digital experiences from Munich and India.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'home-hero',
            headline: 'Where Bold Modesty Inspires Your Creative Argument',
            subheadline:
              'Strategy, design, development and storytelling for future-facing digital experiences between Munich and India.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            secondaryCtaLabel: 'View work',
            secondaryCtaHref: '#selected-work',
            backgroundMediaUrl: heroUrl,
            height: 'tall',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            heroEffect: 'rotating-text',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'home-intro',
            headline:
              'The Modesty Argument connects creative clarity with technical execution.',
            body:
              'We are a creative-tech studio for brands, products and digital experiences that need intention, precision and future-readiness. Our work brings strategy, design, development and storytelling into one clear digital argument.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech visual for The Modesty Argument',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'home-strip',
            quote: 'Where Creativity Meets Technology',
            attribution: 'The Modesty Argument',
            roleLine: 'Creative-tech studio',
            variant: 'border',
            revealMode: 'subtle',
          },
          {
            blockType: 'iconRow',
            id: 'home-capabilities',
            sectionTitle: 'Core Capabilities',
            intro:
              'From brand building to product development, the work is strategic by design and polished in execution.',
            items: [
              { id: 'cap-1', icon: '◆', title: 'Web Design', body: 'Digital presences with clarity, editorial structure and visual precision.' },
              { id: 'cap-2', icon: '◇', title: 'App Development', body: 'Digital products and applications that are robust, fast and brand-ready.' },
              { id: 'cap-3', icon: '○', title: 'Marketing', body: 'Positioning, campaigns and digital systems built for meaningful visibility.' },
              { id: 'cap-4', icon: '✦', title: 'Content Creation', body: 'Storytelling, content and assets that make ideas understandable and desirable.' },
              { id: 'cap-5', icon: '✳', title: 'Brand Identity', body: 'Identity systems and visual language that create recognition and distinction.' },
              { id: 'cap-6', icon: '△', title: 'UX Design', body: 'User experiences that feel intuitive, refined and intentional.' },
            ],
          },
          {
            blockType: 'servicesFocus',
            id: 'home-services',
            sectionTitle: 'Services in Focus',
            intro:
              'Each service combines conceptual thinking with design and technical execution.',
            items: [
              {
                id: 'service-brand',
                title: 'Brand Identity',
                summary: 'Identity systems that shape direction and recognition.',
                bullets: [
                  { id: 'service-brand-1', text: 'Brand positioning and expression' },
                  { id: 'service-brand-2', text: 'Visual systems and identity' },
                  { id: 'service-brand-3', text: 'Consistent brand thinking for digital contexts' },
                ],
                imageUrl: positioningUrl,
                imageAlt: 'Visual for brand identity',
              },
              {
                id: 'service-web',
                title: 'Web Design',
                summary: 'Editorial websites with clarity, atmosphere and digital precision.',
                bullets: [
                  { id: 'service-web-1', text: 'Editorial and conversion-aware websites' },
                  { id: 'service-web-2', text: 'System-led UI and visual hierarchy' },
                  { id: 'service-web-3', text: 'CMS-ready structures for growth' },
                ],
                imageUrl: heroUrl,
                imageAlt: 'Visual for web design',
              },
              {
                id: 'service-app',
                title: 'App Development',
                summary: 'Digital products that are carefully built and aligned with the brand.',
                bullets: [
                  { id: 'service-app-1', text: 'Web apps and digital product interfaces' },
                  { id: 'service-app-2', text: 'Frontend and backend shaped from one concept' },
                  { id: 'service-app-3', text: 'Technically solid, brand-aware implementation' },
                ],
                imageUrl: revopsUrl,
                imageAlt: 'Visual for app development',
              },
              {
                id: 'service-marketing',
                title: 'Marketing',
                summary: 'Campaigns and digital systems where strategy and creation move together.',
                bullets: [
                  { id: 'service-marketing-1', text: 'Digital campaigns with a clear narrative' },
                  { id: 'service-marketing-2', text: 'Performance-aware touchpoints' },
                  { id: 'service-marketing-3', text: 'Strategy and creation inside one system' },
                ],
                imageUrl: demandUrl,
                imageAlt: 'Visual for marketing',
              },
              {
                id: 'service-content',
                title: 'Content Creation',
                summary: 'Content and formats that make the idea, tone and value tangible.',
                bullets: [
                  { id: 'service-content-1', text: 'Content systems instead of isolated assets' },
                  { id: 'service-content-2', text: 'Storytelling for brand, product and demand' },
                  { id: 'service-content-3', text: 'Copy, visuals and assets with clear direction' },
                ],
                imageUrl: auditUrl,
                imageAlt: 'Visual for content creation',
              },
              {
                id: 'service-ux',
                title: 'UX Design',
                summary: 'User-centred digital experiences with clarity and meaning.',
                bullets: [
                  { id: 'service-ux-1', text: 'Structures, flows and interfaces with clarity' },
                  { id: 'service-ux-2', text: 'User-centred digital experiences' },
                  { id: 'service-ux-3', text: 'Less friction, more meaning' },
                ],
                imageUrl: conversionUrl,
                imageAlt: 'Visual for UX design',
              },
            ],
          },
          {
            blockType: 'caseStudyGrid',
            id: 'selected-work',
            sectionTitle: 'Selected Work',
            intro:
              'A preview of selected work where strategy, design and technical execution meet.',
            studies: [
              ctx.caseStudyIds['demo-atlas-reset'],
              ctx.caseStudyIds['demo-helix-demand'],
              ctx.caseStudyIds['demo-northgate-trust'],
            ],
            ctaLabel: 'Explore more',
            ctaHref: '/work',
          },
          {
            blockType: 'textMedia',
            id: 'home-philosophy',
            headline: 'Inspiring Generations',
            body:
              'We believe in digital work that does more than function. The Modesty Argument brings together inspiration, cultural sensitivity and technical depth to create experiences that resonate now and remain relevant later.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Studio philosophy visual',
            imagePosition: 'left',
            mediaWidth: 'wide',
            backgroundEffect: 'glow',
          },
          {
            blockType: 'promoBanner',
            id: 'home-final-cta',
            eyebrow: 'Let’s build something relevant',
            headline: 'Ready for a project shaped by precision, clarity and future-thinking?',
            body:
              'If strategy, design and development should be considered together, we would love to hear about your next digital project.',
            ctaLabel: 'Get in touch',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
          {
            blockType: 'stickyCta',
            label: 'Start project',
            href: '/contact',
            variant: 'primary',
          },
        ],
      },
    },
    {
      slug: 'about',
      title: 'About · The Modesty Argument',
      pageType: 'other',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'about' }),
        navigationLabel: 'About',
        navOrder: 15,
        seo: {
          title: 'About | The Modesty Argument',
          description:
            'The Modesty Argument verbindet kreative Haltung, technologische Klarheit und kulturelle Perspektiven zwischen Munchen und Indien.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'about-hero',
            headline: 'About',
            subheadline:
              'The Modesty Argument verbindet kreative Haltung, technologische Klarheit und kulturelle Perspektiven zwischen Munchen und Indien.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'about-story',
            headline:
              'The Modesty Argument ist ein zukunftsorientiertes Creative-Tech Studio an der Schnittstelle von Strategie, Design, Entwicklung und Storytelling.',
            body:
              'Wir verbinden kreative Richtung mit technischer Umsetzung, um Marken, Produkte und digitale Erlebnisse mit Klarheit und Relevanz zu gestalten. Unsere Arbeit ist international anschlussfahig, kulturell aufmerksam und darauf ausgerichtet, digitale Systeme nicht nur funktional, sondern bedeutungsvoll zu machen.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech studio story visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'about-mission',
            quote:
              'Wir glauben an digitale Arbeit, die nicht nur funktioniert, sondern kulturell und strategisch Resonanz erzeugt.',
            attribution: 'The Modesty Argument',
            roleLine: 'Inspiring Generations',
            variant: 'border',
          },
          {
            blockType: 'iconRow',
            id: 'about-values',
            sectionTitle: 'Werte',
            intro:
              'Unsere Haltung zeigt sich nicht in Lautstarke, sondern in Klarheit, Prazision und relevanter Zusammenarbeit.',
            items: [
              { id: 'about-value-1', icon: '◆', title: 'Klarheit', body: 'Wir schaffen Richtung durch klare Gedanken, starke Strukturen und verstandliche Entscheidungen.' },
              { id: 'about-value-2', icon: '◇', title: 'Haltung', body: 'Wir gestalten mit Uberzeugung, ohne laut zu werden oder Substanz gegen Effekt zu tauschen.' },
              { id: 'about-value-3', icon: '○', title: 'Prazision', body: 'Strategie, Gestaltung und technische Umsetzung mussen sauber aufeinander einzahlen.' },
              { id: 'about-value-4', icon: '✦', title: 'Relevanz', body: 'Digitale Arbeit soll heute Wirkung entfalten und morgen noch Bedeutung haben.' },
              { id: 'about-value-5', icon: '✳', title: 'Zusammenarbeit', body: 'Wir horen zu, denken mit und entwickeln den nachsten sinnvollen Schritt gemeinsam.' },
            ],
          },
          {
            blockType: 'teamGrid',
            id: 'about-team',
            sectionTitle: 'Studio Team',
            intro:
              'Ein kleines, multidisziplinres Team mit kreativer und technischer Perspektive zwischen Munchen und Indien.',
            members: [
              ctx.teamIds['alina-brandt'],
              ctx.teamIds['daniel-noor'],
              ctx.teamIds['leonie-kraft'],
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'about-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Lassen Sie uns gemeinsam Relevanz gestalten',
            body:
              'Wenn Sie nach einem Partner suchen, der Strategie, Gestaltung und Umsetzung zusammen denkt, freuen wir uns auf den Austausch.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        navigationLabel: 'About',
        seo: {
          title: 'About | The Modesty Argument',
          description:
            'The Modesty Argument connects creative intent, technical clarity and cultural perspective between Munich and India.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'about-hero',
            headline: 'About',
            subheadline:
              'The Modesty Argument connects creative intent, technical clarity and cultural perspective between Munich and India.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'about-story',
            headline:
              'The Modesty Argument is a forward-thinking creative-tech studio working at the intersection of strategy, design, development and storytelling.',
            body:
              'We bring together creative direction and technical execution to shape brands, products and digital experiences with clarity and relevance. Our work is internationally aware, culturally attentive and built to make digital systems not only functional, but meaningful.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech studio story visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'about-mission',
            quote:
              'We believe in digital work that does more than function. It should resonate culturally and strategically.',
            attribution: 'The Modesty Argument',
            roleLine: 'Inspiring Generations',
            variant: 'border',
          },
          {
            blockType: 'iconRow',
            id: 'about-values',
            sectionTitle: 'Values',
            intro:
              'Our perspective is expressed through clarity, precision and collaboration rather than corporate noise.',
            items: [
              { id: 'about-value-1', icon: '◆', title: 'Clarity', body: 'We create direction through clear thinking, strong structures and understandable decisions.' },
              { id: 'about-value-2', icon: '◇', title: 'Intent', body: 'We design with conviction without trading substance for effect.' },
              { id: 'about-value-3', icon: '○', title: 'Precision', body: 'Strategy, design and technical execution should reinforce one another cleanly.' },
              { id: 'about-value-4', icon: '✦', title: 'Relevance', body: 'Digital work should matter now and remain meaningful later.' },
              { id: 'about-value-5', icon: '✳', title: 'Collaboration', body: 'We listen, think with our partners and shape the next useful step together.' },
            ],
          },
          {
            blockType: 'teamGrid',
            id: 'about-team',
            sectionTitle: 'Studio Team',
            intro:
              'A small multidisciplinary studio team bringing creative and technical perspectives together between Munich and India.',
            members: [
              ctx.teamIds['alina-brandt'],
              ctx.teamIds['daniel-noor'],
              ctx.teamIds['leonie-kraft'],
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'about-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Let’s shape relevance together',
            body:
              'If you are looking for a partner who thinks strategy, design and execution together, we would love to hear from you.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'work',
      title: 'Work · The Modesty Argument',
      pageType: 'other',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'work' }),
        navigationLabel: 'Work',
        navOrder: 20,
        seo: {
          title: 'Work | The Modesty Argument',
          description:
            'Ausgewahlte Arbeiten, digitale Erlebnisse und Markenprojekte, in denen Strategie, Design und Umsetzung zusammenkommen.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'work-hero',
            headline: 'Work',
            subheadline:
              'Ausgewahlte Arbeiten, digitale Erlebnisse und Markenprojekte, in denen Strategie, Design und Umsetzung zusammenkommen.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'work-intro',
            headline: 'Diese Arbeiten zeigen, wie The Modesty Argument kreative Richtung und technische Umsetzung verbindet.',
            body:
              'Unsere ausgewahlten Projekte stehen fur kreative Klarheit, hochwertige Gestaltung, digitale Systeme und markentaugliche Umsetzung. Sie zeigen, wie Branding, UX, Entwicklung und Storytelling in einem zusammenhangenden Ergebnis aufeinandertreffen.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Editorial work overview visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'caseStudyGrid',
            id: 'work-grid',
            sectionTitle: 'Featured Work',
            intro:
              'Kuratiert aus unserer aktuellen Bibliothek: Arbeiten mit Fokus auf Identitat, digitale Produkte, Kampagnen und immersive Markenerlebnisse.',
            studies: [
              ctx.caseStudyIds['demo-atlas-reset'],
              ctx.caseStudyIds['demo-helix-demand'],
              ctx.caseStudyIds['demo-northgate-trust'],
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'work-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Lassen Sie uns gemeinsam etwas Relevantes schaffen',
            body:
              'Wenn Sie ein digitales Projekt, eine Marke oder ein Produkt mit Substanz entwickeln mochten, sprechen wir gern mit Ihnen.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        navigationLabel: 'Work',
        seo: {
          title: 'Work | The Modesty Argument',
          description:
            'Selected work, digital experiences and brand projects where strategy, design and execution come together.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'work-hero',
            headline: 'Work',
            subheadline:
              'Selected work, digital experiences and brand projects where strategy, design and execution come together.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'work-intro',
            headline: 'This work shows how The Modesty Argument connects creative direction with technical execution.',
            body:
              'These selected projects reflect creative clarity, polished design, digital systems and brand-aware implementation. They show how branding, UX, development and storytelling can meet in one coherent result.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Editorial work overview visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'caseStudyGrid',
            id: 'work-grid',
            sectionTitle: 'Featured Work',
            intro:
              'Curated from the current library: work focused on identity, digital products, campaigns and immersive brand experiences.',
            studies: [
              ctx.caseStudyIds['demo-atlas-reset'],
              ctx.caseStudyIds['demo-helix-demand'],
              ctx.caseStudyIds['demo-northgate-trust'],
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'work-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Let’s create something relevant together',
            body:
              'If you want to shape a digital project, a brand or a product with substance, we would love to talk.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'projects',
      title: 'Projects · The Modesty Argument',
      pageType: 'other',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'projects' }),
        navigationLabel: 'Projects',
        navOrder: 22,
        seo: {
          title: 'Projects | The Modesty Argument',
          description:
            'Projekte, Systeme und digitale Vorhaben, in denen Idee, Gestaltung und Umsetzung in eine klare Richtung zusammenfinden.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'projects-hero',
            headline: 'Projects',
            subheadline:
              'Projekte, Systeme und digitale Vorhaben, in denen Idee, Gestaltung und Umsetzung in eine klare Richtung zusammenfinden.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'projects-intro',
            headline: 'Projects bedeutet bei uns mehr als finale Case Studies.',
            body:
              'Die Seite zeigt ein breiteres Feld an Vorhaben: digitale Produktkonzepte, Experience-Systeme, redaktionelle Builds und markengeführte Initiativen. Sie macht sichtbar, wie The Modesty Argument Ideen, Gestaltung und technische Umsetzung in strukturierte digitale Arbeit übersetzt.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech projects visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'productFeed',
            id: 'projects-feed',
            sectionTitle: 'Project Landscape',
            intro:
              'Kuratiert aus den Produkt- und Konzeptobjekten im CMS: Projekte, Systeme und digitale Richtungen mit gestalterischer und technischer Tiefe.',
            featuredProduct: ctx.productIds['signal-atelier'],
            products: [
              ctx.productIds['signal-atelier'],
              ctx.productIds['atlas-os'],
              ctx.productIds['luma-editorial-engine'],
            ],
            selectionMode: 'hybrid',
            contentKinds: ['project', 'concept', 'system', 'initiative'],
            sortBy: 'listingPriority',
            sortDirection: 'asc',
            showOnlyProjectFeedEligible: true,
            showAllPublished: false,
            limit: 6,
          },
          {
            blockType: 'promoBanner',
            id: 'projects-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Lassen Sie uns aus Ideen ein starkes digitales Projekt machen',
            body:
              'Wenn aus Richtung, Gestaltung und technischer Umsetzung ein relevantes Projekt werden soll, sprechen wir gern über den nächsten Schritt.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        navigationLabel: 'Projects',
        seo: {
          title: 'Projects | The Modesty Argument',
          description:
            'Projects, systems and digital initiatives where idea, design and execution converge into one clear direction.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'projects-hero',
            headline: 'Projects',
            subheadline:
              'Projects, systems and digital initiatives where idea, design and execution converge into one clear direction.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'projects-intro',
            headline: 'For us, Projects means more than polished flagship case studies.',
            body:
              'This page represents a broader project landscape: digital product concepts, experience systems, editorial builds and brand-led initiatives. It shows how The Modesty Argument turns ideas, design and technical execution into structured digital work.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech projects visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'productFeed',
            id: 'projects-feed',
            sectionTitle: 'Project Landscape',
            intro:
              'Curated from the product and concept entities in the CMS: projects, systems and digital directions with creative and technical depth.',
            featuredProduct: ctx.productIds['signal-atelier'],
            products: [
              ctx.productIds['signal-atelier'],
              ctx.productIds['atlas-os'],
              ctx.productIds['luma-editorial-engine'],
            ],
            selectionMode: 'hybrid',
            contentKinds: ['project', 'concept', 'system', 'initiative'],
            sortBy: 'listingPriority',
            sortDirection: 'asc',
            showOnlyProjectFeedEligible: true,
            showAllPublished: false,
            limit: 6,
          },
          {
            blockType: 'promoBanner',
            id: 'projects-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Let’s turn ideas into a strong digital project',
            body:
              'If direction, design and technical execution should become one relevant project, we would love to talk about the next step.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'news',
      title: 'News · The Modesty Argument',
      pageType: 'other',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'news' }),
        navigationLabel: 'News',
        navOrder: 25,
        seo: {
          title: 'News | The Modesty Argument',
          description:
            'Perspektiven, Updates und Gedanken zu Gestaltung, Technologie, Marke und digitaler Relevanz.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'news-hero',
            headline: 'News',
            subheadline:
              'Perspektiven, Updates und Gedanken zu Gestaltung, Technologie, Marke und digitaler Relevanz.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'news-intro',
            headline: 'Hier teilen wir Studio-Updates, Perspektiven und Ideen an der Schnittstelle von Kreativität und Technologie.',
            body:
              'Die News-Seite bündelt Einblicke aus unserer Arbeit, Gedanken zu Marke, Design, Produkt und digitaler Kultur sowie Updates aus dem Studio. Sie soll eine lebendige, glaubwürdige Präsenz zeigen - nicht Lautstärke, sondern Richtung.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Editorial creative-tech visual for news positioning',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'resourceFeed',
            id: 'news-feed',
            sectionTitle: 'Aktuelle Beiträge',
            intro:
              'Ausgewählte Artikel und Perspektiven aus dem Studio. Der neueste veröffentlichte Resource-Eintrag erscheint automatisch zuerst.',
            showAllPublished: true,
            limit: 6,
          },
          {
            blockType: 'promoBanner',
            id: 'news-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Lassen Sie uns über Ideen mit Relevanz sprechen',
            body:
              'Wenn aus Perspektive, Strategie und Gestaltung ein konkretes digitales Vorhaben werden soll, freuen wir uns auf den Austausch.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        navigationLabel: 'News',
        seo: {
          title: 'News | The Modesty Argument',
          description:
            'Perspectives, updates and thoughts on design, technology, brand and digital relevance.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'news-hero',
            headline: 'News',
            subheadline:
              'Perspectives, updates and thoughts on design, technology, brand and digital relevance.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'news-intro',
            headline: 'This is where we share studio updates, perspectives and ideas at the intersection of creativity and technology.',
            body:
              'The News page brings together notes from the studio, perspectives on brand, design, product and digital culture, and signals what currently matters in our work. It should feel alive and credible without becoming noisy.',
            imageUrl: videoPosterUrl,
            imageAlt: 'Editorial creative-tech visual for news positioning',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'resourceFeed',
            id: 'news-feed',
            sectionTitle: 'Latest articles',
            intro:
              'Selected editorial entries and perspectives from the studio. The newest published resource page appears first automatically.',
            showAllPublished: true,
            limit: 6,
          },
          {
            blockType: 'promoBanner',
            id: 'news-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Let’s talk about ideas that deserve relevance',
            body:
              'If perspective, strategy and design should turn into a concrete digital initiative, we would love to talk.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'creative-tech-with-clarity',
      title: 'Creative Tech With Clarity · The Modesty Argument',
      pageType: 'resource',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'creative-tech-with-clarity' }),
        seo: {
          title: 'Creative Tech mit Klarheit | The Modesty Argument',
          description:
            'Warum kreative-technologische Arbeit Richtung braucht, wenn Marken, Systeme und digitale Erlebnisse relevant bleiben sollen.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-clarity-hero',
            headline: 'Creative Tech mit Klarheit',
            subheadline:
              'Warum kreative-technologische Arbeit Richtung braucht, wenn Marken, Systeme und digitale Erlebnisse relevant bleiben sollen.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-clarity-story',
            headline: 'Technologie ohne kreative Richtung erzeugt Tempo, aber selten Bedeutung.',
            body:
              'Für uns entsteht gute digitale Arbeit dort, wo gestalterische Intention und technische Präzision ein gemeinsames System bilden. Marken, Produkte und Plattformen brauchen nicht nur Funktionen, sondern eine erkennbare Argumentation, die Entscheidungen trägt und Menschen Orientierung gibt.',
            imageUrl: positioningUrl,
            imageAlt: 'Editorial visual for creative tech clarity',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-clarity-quote',
            quote:
              'Klarheit ist kein Stilmittel. Sie ist die Voraussetzung dafür, dass kreative und technische Arbeit in dieselbe Richtung wirken.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-clarity-cta',
            eyebrow: 'Next step',
            headline: 'Wenn kreative Richtung und technische Umsetzung zusammenfinden sollen, sprechen wir gern über Ihr Vorhaben.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        seo: {
          title: 'Creative Tech With Clarity | The Modesty Argument',
          description:
            'Why creative-tech work needs direction when brands, systems and digital experiences are meant to stay relevant.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-clarity-hero',
            headline: 'Creative Tech With Clarity',
            subheadline:
              'Why creative-tech work needs direction when brands, systems and digital experiences are meant to stay relevant.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-clarity-story',
            headline: 'Technology without creative direction can create speed, but rarely meaning.',
            body:
              'For us, strong digital work emerges when design intent and technical precision become part of the same system. Brands, products and platforms need more than features. They need a recognisable argument that guides decisions and gives people orientation.',
            imageUrl: positioningUrl,
            imageAlt: 'Editorial visual for creative-tech clarity',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-clarity-quote',
            quote:
              'Clarity is not an aesthetic trick. It is what allows creative and technical work to move in the same direction.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-clarity-cta',
            eyebrow: 'Next step',
            headline: 'If creative direction and technical execution should align, we would love to hear about your project.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'design-systems-not-silos',
      title: 'Design Systems, Not Silos · The Modesty Argument',
      pageType: 'resource',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'design-systems-not-silos' }),
        seo: {
          title: 'Design Systems statt Silos | The Modesty Argument',
          description:
            'Wie Marken-, UX- und Entwicklungssysteme zusammenarbeiten müssen, damit digitale Qualität skalierbar wird.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-systems-hero',
            headline: 'Design Systems statt Silos',
            subheadline:
              'Wie Marken-, UX- und Entwicklungssysteme zusammenarbeiten müssen, damit digitale Qualität skalierbar wird.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            backgroundMediaUrl: demandUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-systems-story',
            headline: 'Sobald Teams in Disziplinen statt in Systemen denken, verliert die digitale Erfahrung an Kohärenz.',
            body:
              'Gute Markenarbeit endet nicht beim Logo. Gutes UX endet nicht bei Wireframes. Gute Entwicklung endet nicht beim Deploy. Relevante Plattformen entstehen dann, wenn Identität, Interface, Inhalte und technische Logik als zusammenhängende Struktur gebaut werden.',
            imageUrl: demandUrl,
            imageAlt: 'Editorial visual for design systems',
            imagePosition: 'left',
            mediaWidth: 'wide',
            backgroundEffect: 'orb',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-systems-quote',
            quote:
              'Systeme schaffen Skalierbarkeit. Silos schaffen Reibung.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-systems-cta',
            eyebrow: 'Collaboration',
            headline: 'Wenn Marke, UX und Entwicklung kohärent arbeiten sollen, lohnt sich ein gemeinsamer Startpunkt.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        seo: {
          title: 'Design Systems, Not Silos | The Modesty Argument',
          description:
            'Why brand, UX and engineering systems need to work together if digital quality should scale.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-systems-hero',
            headline: 'Design Systems, Not Silos',
            subheadline:
              'Why brand, UX and engineering systems need to work together if digital quality should scale.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            backgroundMediaUrl: demandUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-systems-story',
            headline: 'As soon as teams think in disciplines instead of systems, the digital experience loses coherence.',
            body:
              'Strong brand work does not stop at the logo. Good UX does not stop at wireframes. Strong engineering does not stop at deployment. Relevant platforms emerge when identity, interface, content and technical logic are built as one connected structure.',
            imageUrl: demandUrl,
            imageAlt: 'Editorial visual for design systems',
            imagePosition: 'left',
            mediaWidth: 'wide',
            backgroundEffect: 'orb',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-systems-quote',
            quote:
              'Systems create scalability. Silos create friction.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-systems-cta',
            eyebrow: 'Collaboration',
            headline: 'If brand, UX and engineering should work coherently, it helps to begin from one shared starting point.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'storytelling-for-digital-relevance',
      title: 'Storytelling for Digital Relevance · The Modesty Argument',
      pageType: 'resource',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'storytelling-for-digital-relevance' }),
        seo: {
          title: 'Storytelling für digitale Relevanz | The Modesty Argument',
          description:
            'Warum digitale Produkte und Marken nicht nur erklärt, sondern erzählerisch verankert werden müssen.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-storytelling-hero',
            headline: 'Storytelling für digitale Relevanz',
            subheadline:
              'Warum digitale Produkte und Marken nicht nur erklärt, sondern erzählerisch verankert werden müssen.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            backgroundMediaUrl: revopsUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-storytelling-story',
            headline: 'Menschen erinnern sich selten an Funktionslisten. Sie erinnern sich an Bedeutung, Haltung und Kontext.',
            body:
              'Deshalb behandeln wir Storytelling nicht als nachgelagerten Marketing-Schritt. Es ist Teil der Produkt- und Markengestaltung selbst. Gute digitale Erlebnisse erklären nicht nur, was etwas kann. Sie machen sichtbar, warum es zählt und wie es sich anfühlt.',
            imageUrl: revopsUrl,
            imageAlt: 'Editorial visual for storytelling and digital relevance',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glow',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-storytelling-quote',
            quote:
              'Relevanz entsteht dort, wo Menschen nicht nur Informationen verstehen, sondern Haltung wahrnehmen.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-storytelling-cta',
            eyebrow: 'Perspective',
            headline: 'Wenn Marke, Produkt und Story als ein gemeinsames Erlebnis gedacht werden sollen, sprechen wir gern mit Ihnen.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        seo: {
          title: 'Storytelling for Digital Relevance | The Modesty Argument',
          description:
            'Why digital products and brands need to be anchored through narrative, not just explained through features.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'resource-storytelling-hero',
            headline: 'Storytelling for Digital Relevance',
            subheadline:
              'Why digital products and brands need to be anchored through narrative, not just explained through features.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            backgroundMediaUrl: revopsUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'resource-storytelling-story',
            headline: 'People rarely remember feature lists. They remember meaning, intent and context.',
            body:
              'That is why we do not treat storytelling as a late marketing layer. It is part of product and brand design itself. Strong digital experiences do more than explain what something can do. They make visible why it matters and how it should feel.',
            imageUrl: revopsUrl,
            imageAlt: 'Editorial visual for storytelling and digital relevance',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glow',
          },
          {
            blockType: 'quoteBand',
            id: 'resource-storytelling-quote',
            quote:
              'Relevance happens where people do not only understand information, but also perceive intent.',
            attribution: 'The Modesty Argument',
            roleLine: 'Studio perspective',
            variant: 'border',
          },
          {
            blockType: 'promoBanner',
            id: 'resource-storytelling-cta',
            eyebrow: 'Perspective',
            headline: 'If brand, product and story should be shaped as one experience, we would love to talk.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'services',
      title: 'What We Do · The Modesty Argument',
      pageType: 'services',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'services' }),
        navigationLabel: 'Leistungen',
        navOrder: 10,
        seo: {
          title: 'What We Do | The Modesty Argument',
          description:
            'Kreative, technische und strategische Leistungen fur Marken, Produkte und digitale Erlebnisse mit Klarheit, Struktur und Wirkung.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'services-hero',
            headline: 'What We Do',
            subheadline:
              'Kreative, technische und strategische Leistungen, die Marken, Produkte und digitale Erlebnisse mit Klarheit und Wirkung aufbauen.',
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'services-intro',
            headline: 'Kreativitat, Marke, UX, Content, Marketing und Entwicklung greifen bei uns ineinander.',
            body:
              'The Modesty Argument verbindet kreative Richtung mit technischer Umsetzung. Wir entwickeln Markenidentitaten, Websites, Apps, Content-Systeme, Marketing-Touchpoints und Nutzererlebnisse als zusammenhangende digitale Arbeit statt als isolierte Einzelleistungen.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech service positioning visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'servicesFocus',
            id: 'services-focus',
            sectionTitle: 'Service Navigator',
            intro:
              'Jede Leistung verbindet strategisches Denken mit gestalterischer und technischer Prazision.',
            items: [
              {
                id: 'services-brand',
                title: 'Brand Identity',
                summary:
                  'Markensysteme und Ausdrucksformen, die Haltung, Wiedererkennbarkeit und digitale Konsistenz schaffen.',
                bullets: [
                  { id: 'services-brand-1', text: 'Markenpositionierung und strategische Klarheit' },
                  { id: 'services-brand-2', text: 'Visuelle Identitatssysteme und Markenausdruck' },
                  { id: 'services-brand-3', text: 'Konsistenz uber digitale Touchpoints hinweg' },
                ],
                imageUrl: positioningUrl,
                imageAlt: 'Visual fur Brand Identity',
              },
              {
                id: 'services-web',
                title: 'Web Design',
                summary:
                  'Editoriale, hochwertige Websites mit klarer Struktur, markentauglicher Gestaltung und technischer Anschlussfahigkeit.',
                bullets: [
                  { id: 'services-web-1', text: 'Editoriale und conversion-starke Websites' },
                  { id: 'services-web-2', text: 'Hochwertige Interfaces mit klarer Hierarchie' },
                  { id: 'services-web-3', text: 'CMS-fahige Strukturen fur langfristiges Wachstum' },
                ],
                imageUrl: heroUrl,
                imageAlt: 'Visual fur Web Design',
              },
              {
                id: 'services-app',
                title: 'App Development',
                summary:
                  'Digitale Produkte und Anwendungen, die skalierbar, markengerecht und technisch sauber umgesetzt sind.',
                bullets: [
                  { id: 'services-app-1', text: 'Skalierbare Apps und digitale Produkte' },
                  { id: 'services-app-2', text: 'Technisch saubere Frontend- und Backend-Losungen' },
                  { id: 'services-app-3', text: 'Nutzerorientierte Funktionalitat mit Markenfit' },
                ],
                imageUrl: revopsUrl,
                imageAlt: 'Visual fur App Development',
              },
              {
                id: 'services-marketing',
                title: 'Marketing',
                summary:
                  'Strategische Kampagnen und digitale Systeme, die Sichtbarkeit, Interaktion und Relevanz zusammenbringen.',
                bullets: [
                  { id: 'services-marketing-1', text: 'Kampagnen mit strategischer Richtung' },
                  { id: 'services-marketing-2', text: 'Performance-orientierte digitale Touchpoints' },
                  { id: 'services-marketing-3', text: 'Sichtbarkeit, Reichweite und Interaktion' },
                ],
                imageUrl: demandUrl,
                imageAlt: 'Visual fur Marketing',
              },
              {
                id: 'services-content',
                title: 'Content Creation',
                summary:
                  'Storytelling, Copy und visuelle Assets, die Ideen verstandlich, relevant und begehrlich machen.',
                bullets: [
                  { id: 'services-content-1', text: 'Storytelling, Copywriting und visuelle Systeme' },
                  { id: 'services-content-2', text: 'Inhalte fur Marke, Produkt und Nachfrage' },
                  { id: 'services-content-3', text: 'Kreative Assets mit klarer Richtung' },
                ],
                imageUrl: auditUrl,
                imageAlt: 'Visual fur Content Creation',
              },
              {
                id: 'services-ux',
                title: 'UX Design',
                summary:
                  'Nutzerzentrierte digitale Erlebnisse mit Klarheit, Relevanz und weniger Reibung in jeder Interaktion.',
                bullets: [
                  { id: 'services-ux-1', text: 'Nutzerzentrierte Strukturen und Journeys' },
                  { id: 'services-ux-2', text: 'Interfaces mit Klarheit und Relevanz' },
                  { id: 'services-ux-3', text: 'Weniger Reibung, mehr Wirkung' },
                ],
                imageUrl: conversionUrl,
                imageAlt: 'Visual fur UX Design',
              },
            ],
            ctaLabel: 'Projekt starten',
            ctaHref: '/contact',
          },
          {
            blockType: 'process',
            id: 'services-process',
            sectionTitle: 'How We Work',
            intro:
              'Unser Ablauf ist klar, kollaborativ und auf hochwertige digitale Ergebnisse ausgerichtet.',
            steps: [
              {
                id: 'services-step-1',
                badge: '01',
                title: 'Discover',
                body:
                  'Wir verstehen Kontext, Ambition, Marke und Nutzer, bevor wir in Losungen denken.',
              },
              {
                id: 'services-step-2',
                badge: '02',
                title: 'Design',
                body:
                  'Wir formen Richtung, Systeme und Erlebnisse mit Klarheit, Haltung und visueller Prazision.',
              },
              {
                id: 'services-step-3',
                badge: '03',
                title: 'Build',
                body:
                  'Wir setzen digital sauber um, sodass Gestaltung, Technik und CMS-Fahigkeit zusammenpassen.',
              },
              {
                id: 'services-step-4',
                badge: '04',
                title: 'Launch',
                body:
                  'Wir bringen die Arbeit in reale Nutzung und schaffen eine Grundlage fur Wachstum und Weiterentwicklung.',
              },
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'services-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Lassen Sie uns Ihr nachstes digitales Kapitel gestalten',
            body:
              'Wenn Strategie, Design und Entwicklung zusammen gedacht werden sollen, sprechen wir gern uber Ihr Vorhaben.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
          {
            blockType: 'stickyCta',
            id: 'services-sticky-cta',
            label: 'Projekt starten',
            href: '/contact',
            variant: 'primary',
          },
        ],
      },
      en: {
        navigationLabel: 'What We Do',
        seo: {
          title: 'What We Do | The Modesty Argument',
          description:
            'Creative, technical and strategic services combined to build brands, products and digital experiences with clarity and impact.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'services-hero',
            headline: 'What We Do',
            subheadline:
              'Creative, technical and strategic services combined to build brands, products and digital experiences with clarity and impact.',
            ctaLabel: 'Start project',
            ctaHref: '/contact',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            blockType: 'textMedia',
            id: 'services-intro',
            headline:
              'Creativity, brand, UX, content, marketing and development work together here.',
            body:
              'The Modesty Argument combines creative direction with technical execution. We shape brand systems, websites, apps, content, marketing touchpoints and user experiences as connected digital work rather than isolated deliverables.',
            imageUrl: positioningUrl,
            imageAlt: 'Creative-tech service positioning visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            blockType: 'servicesFocus',
            id: 'services-focus',
            sectionTitle: 'Service Navigator',
            intro:
              'Each service combines strategic thinking with design and technical execution.',
            items: [
              {
                id: 'services-brand',
                title: 'Brand Identity',
                summary:
                  'Identity systems and expressions that create direction, recognition and digital consistency.',
                bullets: [
                  { id: 'services-brand-1', text: 'Brand positioning and strategic clarity' },
                  { id: 'services-brand-2', text: 'Visual identity systems and brand expression' },
                  { id: 'services-brand-3', text: 'Consistency across digital touchpoints' },
                ],
                imageUrl: positioningUrl,
                imageAlt: 'Visual for brand identity',
              },
              {
                id: 'services-web',
                title: 'Web Design',
                summary:
                  'Editorial, high-quality websites with clear structure, brand presence and long-term technical flexibility.',
                bullets: [
                  { id: 'services-web-1', text: 'Editorial and conversion-strong websites' },
                  { id: 'services-web-2', text: 'High-quality interfaces with clear hierarchy' },
                  { id: 'services-web-3', text: 'CMS-ready structures for long-term growth' },
                ],
                imageUrl: heroUrl,
                imageAlt: 'Visual for web design',
              },
              {
                id: 'services-app',
                title: 'App Development',
                summary:
                  'Scalable digital products and applications built with technical rigor and brand fit.',
                bullets: [
                  { id: 'services-app-1', text: 'Scalable apps and digital products' },
                  { id: 'services-app-2', text: 'Clean frontend and backend solutions' },
                  { id: 'services-app-3', text: 'User-oriented functionality with brand fit' },
                ],
                imageUrl: revopsUrl,
                imageAlt: 'Visual for app development',
              },
              {
                id: 'services-marketing',
                title: 'Marketing',
                summary:
                  'Strategic campaigns and digital touchpoints designed for visibility, interaction and momentum.',
                bullets: [
                  { id: 'services-marketing-1', text: 'Campaigns with strategic direction' },
                  { id: 'services-marketing-2', text: 'Performance-oriented digital touchpoints' },
                  { id: 'services-marketing-3', text: 'Visibility, reach and interaction' },
                ],
                imageUrl: demandUrl,
                imageAlt: 'Visual for marketing',
              },
              {
                id: 'services-content',
                title: 'Content Creation',
                summary:
                  'Storytelling, copy and visual assets that make ideas clear, relevant and desirable.',
                bullets: [
                  { id: 'services-content-1', text: 'Storytelling, copywriting and visual systems' },
                  { id: 'services-content-2', text: 'Content for brand, product and demand' },
                  { id: 'services-content-3', text: 'Creative assets with clear direction' },
                ],
                imageUrl: auditUrl,
                imageAlt: 'Visual for content creation',
              },
              {
                id: 'services-ux',
                title: 'UX Design',
                summary:
                  'User-centred digital experiences with clarity, relevance and less friction in every interaction.',
                bullets: [
                  { id: 'services-ux-1', text: 'User-centred structures and journeys' },
                  { id: 'services-ux-2', text: 'Interfaces with clarity and relevance' },
                  { id: 'services-ux-3', text: 'Less friction, more impact' },
                ],
                imageUrl: conversionUrl,
                imageAlt: 'Visual for UX design',
              },
            ],
            ctaLabel: 'Start project',
            ctaHref: '/contact',
          },
          {
            blockType: 'process',
            id: 'services-process',
            sectionTitle: 'How We Work',
            intro:
              'Our workflow is clear, collaborative and designed for high-quality digital outcomes.',
            steps: [
              {
                id: 'services-step-1',
                badge: '01',
                title: 'Discover',
                body:
                  'We understand context, ambition, brand and audience before moving into solutions.',
              },
              {
                id: 'services-step-2',
                badge: '02',
                title: 'Design',
                body:
                  'We shape direction, systems and experiences with clarity, intention and visual precision.',
              },
              {
                id: 'services-step-3',
                badge: '03',
                title: 'Build',
                body:
                  'We implement with technical care so design, engineering and CMS flexibility stay aligned.',
              },
              {
                id: 'services-step-4',
                badge: '04',
                title: 'Launch',
                body:
                  'We bring the work into real use and create a foundation for growth and iteration.',
              },
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'services-final-cta',
            eyebrow: 'Collaboration',
            headline: 'Let’s shape your next digital chapter',
            body:
              'If strategy, design and development need to be considered together, we would love to hear about your project.',
            ctaLabel: 'Contact us',
            ctaHref: '/contact',
            variant: 'gradient',
            align: 'left',
          },
          {
            blockType: 'stickyCta',
            id: 'services-sticky-cta',
            label: 'Start project',
            href: '/contact',
            variant: 'primary',
          },
        ],
      },
    },
    {
      slug: 'demo-ai-positioning',
      title: 'AI Positioning Service',
      pageType: 'service',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-ai-positioning', serviceSlug: 'demo-ai-positioning' }),
        seo: {
          title: 'AI Positioning Service',
          description: 'Seeded service page for positioning and proof.',
        },
        hero: {
          headline: 'AI Positioning Service',
          subheadline: 'Positionierung, Proof und Buyer Story fur AI-native Teams.',
        },
        primaryCta: { label: 'Produkt ansehen', href: '/products/demo-ai-positioning-sprint' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Von vagen AI-Claims zu klarer Buyer Language',
            body: 'Diese Seite zeigt, wie Service Page, Product Page und Booking Flow sauber miteinander verbunden werden konnen.',
            imageUrl: positioningUrl,
            imageAlt: 'Positioning visual',
            imagePosition: 'left',
          },
          {
            blockType: 'stats',
            items: [
              { value: '2', suffix: 'w', label: 'Beispiel-Sprint' },
              { value: '1', label: 'Story spine' },
              { value: '3', label: 'Buyer proof layers' },
            ],
          },
          {
            blockType: 'testimonialSlider',
            testimonials: ctx.testimonials,
          },
          {
            blockType: 'faq',
            items: [
              { question: 'Wie passen wir diesen Service an?', answer: 'Ersetze Headline, Body, Produktverweis, FAQ und die Ziel-CTA zuerst.' },
              { question: 'Warum gibt es einen Product Link?', answer: 'Die Seite zeigt bewusst die Verbindung zwischen Services und Product-detail pages.' },
            ],
          },
          {
            blockType: 'booking',
            bookingProfile: ctx.bookingIds['demo-strategy-call'],
          },
        ],
      },
      en: {
        seo: {
          title: 'AI positioning service',
          description: 'Seeded service page for positioning and proof.',
        },
        hero: {
          headline: 'AI positioning service',
          subheadline: 'Positioning, proof, and buyer narrative for AI-native teams.',
        },
        primaryCta: { label: 'View product', href: '/products/demo-ai-positioning-sprint' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'From vague AI claims to sharper buyer language',
            body: 'This page shows how a service page, product page, and booking flow can reference one another cleanly.',
            imageUrl: positioningUrl,
            imageAlt: 'Positioning visual',
            imagePosition: 'left',
          },
          {
            blockType: 'stats',
            items: [
              { value: '2', suffix: 'w', label: 'Example sprint' },
              { value: '1', label: 'Story spine' },
              { value: '3', label: 'Buyer proof layers' },
            ],
          },
          {
            blockType: 'testimonialSlider',
            testimonials: ctx.testimonials,
          },
          {
            blockType: 'faq',
            items: [
              { question: 'How do we adapt this service?', answer: 'Replace headline, body copy, product reference, FAQ, and CTA destination first.' },
              { question: 'Why include a product link?', answer: 'The page intentionally shows the relationship between service pages and product detail pages.' },
            ],
          },
          {
            blockType: 'booking',
            bookingProfile: ctx.bookingIds['demo-strategy-call'],
          },
        ],
      },
    },
    {
      slug: 'demo-demand-systems',
      title: 'Demand Systems Service',
      pageType: 'service',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-demand-systems', serviceSlug: 'demo-demand-systems' }),
        seo: {
          title: 'Demand Systems Service',
          description: 'Seeded service page for campaigns, landing paths, and lead quality.',
        },
        hero: {
          headline: 'Demand Systems Service',
          subheadline: 'Kampagnen, Landing Paths und Lead-Qualitat in einer sichtbaren Struktur.',
        },
        primaryCta: { label: 'Audit anfordern', href: '/demo-gtm-audit' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Mehr als nur mehr Traffic',
            body: 'Der seeded Service fokussiert auf message-match, landing structure, and follow-up quality statt auf rohe Lead-Zahl.',
            imageUrl: demandUrl,
            imageAlt: 'Demand systems placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'comparison',
            sectionTitle: 'Vergleich',
            columns: [{ heading: 'Vorher' }, { heading: 'Nachher' }],
            rows: [
              { label: 'CTA', cells: [{ value: 'Vage' }, { value: 'Nutzbar und spezifisch' }] },
              { label: 'Form capture', cells: [{ value: 'Zu generisch' }, { value: 'Kontextstark' }] },
              { label: 'Follow-up', cells: [{ value: 'Unklar' }, { value: 'Owner + next step sichtbar' }] },
            ],
          },
          {
            blockType: 'form',
            formConfig: ctx.formIds['demo-discovery'],
            width: 'wide',
          },
        ],
      },
      en: {
        seo: {
          title: 'Demand systems service',
          description: 'Seeded service page for campaigns, landing paths, and lead quality.',
        },
        hero: {
          headline: 'Demand systems service',
          subheadline: 'Campaigns, landing paths, and lead quality inside one visible structure.',
        },
        primaryCta: { label: 'Request audit', href: '/demo-gtm-audit' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'More than just more traffic',
            body: 'The seeded service focuses on message match, landing structure, and follow-up quality instead of raw lead volume.',
            imageUrl: demandUrl,
            imageAlt: 'Demand systems placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'comparison',
            sectionTitle: 'Comparison',
            columns: [{ heading: 'Before' }, { heading: 'After' }],
            rows: [
              { label: 'CTA', cells: [{ value: 'Vague' }, { value: 'Usable and specific' }] },
              { label: 'Form capture', cells: [{ value: 'Too generic' }, { value: 'Rich in context' }] },
              { label: 'Follow-up', cells: [{ value: 'Unclear' }, { value: 'Owner + next step visible' }] },
            ],
          },
          {
            blockType: 'form',
            formConfig: ctx.formIds['demo-discovery'],
            width: 'wide',
          },
        ],
      },
    },
    {
      slug: 'demo-revops-instrumentation',
      title: 'RevOps Instrumentation Service',
      pageType: 'service',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-revops-instrumentation', serviceSlug: 'demo-revops-instrumentation' }),
        seo: {
          title: 'RevOps Instrumentation Service',
          description: 'Seeded service page for attribution, routing, and lead operations.',
        },
        hero: {
          headline: 'RevOps Instrumentation Service',
          subheadline: 'Attribution, routing, tasks und owner handoff fur die Revenue Engine.',
        },
        primaryCta: { label: 'Kontakt aufnehmen', href: '/contact' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Die Pipeline muss lesbar sein',
            body: 'Nutze diese Service-Struktur fur Attribution, lead routing und owner visibility.',
            imageUrl: revopsUrl,
            imageAlt: 'RevOps placeholder',
            imagePosition: 'left',
          },
          {
            blockType: 'caseStudyGrid',
            sectionTitle: 'Attribution snapshots',
            studies: [],
          },
          {
            blockType: 'faq',
            items: [
              { question: 'Warum seeded leads im System?', answer: 'Damit Dashboard, lead list, booking list und sync error views nicht leer sind.' },
              { question: 'Kann dieses Setup in Produktion bleiben?', answer: 'Nein. Seeded leads, emails und sample sync logs sollten vor Launch entfernt oder ersetzt werden.' },
            ],
          },
          {
            blockType: 'form',
            formConfig: ctx.formIds['demo-contact'],
          },
        ],
      },
      en: {
        seo: {
          title: 'RevOps instrumentation service',
          description: 'Seeded service page for attribution, routing, and lead operations.',
        },
        hero: {
          headline: 'RevOps instrumentation service',
          subheadline: 'Attribution, routing, tasks, and ownership handoff for the revenue engine.',
        },
        primaryCta: { label: 'Contact us', href: '/contact' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'The pipeline has to be readable',
            body: 'Use this service page as a seeded example for attribution, lead routing, and owner visibility.',
            imageUrl: revopsUrl,
            imageAlt: 'RevOps placeholder',
            imagePosition: 'left',
          },
          {
            blockType: 'caseStudyGrid',
            sectionTitle: 'Attribution snapshots',
            studies: [],
          },
          {
            blockType: 'faq',
            items: [
              { question: 'Why seed leads into the system?', answer: 'So the dashboard, lead list, booking list, and sync failure views are not empty in development.' },
              { question: 'Can this stay in production?', answer: 'No. Seeded leads, emails, and sample sync logs should be removed or replaced before launch.' },
            ],
          },
          {
            blockType: 'form',
            formConfig: ctx.formIds['demo-contact'],
          },
        ],
      },
    },
    {
      slug: 'demo-gtm-audit',
      title: 'GTM Audit Landing',
      pageType: 'landing',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-gtm-audit' }),
        seo: {
          title: 'GTM Audit Landing',
          description: 'Seeded landing page for audit capture and lead qualification.',
        },
        hero: {
          headline: 'Landingpage: GTM Audit',
          subheadline: 'Eine seeded Landingpage fur Audit-Downloads, trust framing und qualifizierte Formulare.',
        },
        primaryCta: { label: 'Audit anfordern', href: '#audit-form' },
        layout: [
          {
            blockType: 'imageBanner',
            id: 'audit-visual',
            imageUrl: auditUrl,
            imageAlt: 'Audit placeholder image',
            headline: 'Angebot fur Teardown und Funnel Audit',
            subheadline: 'Mit seeded Blocks fur stats, proof, FAQ und Form capture.',
            ctaLabel: 'Formular offnen',
            ctaHref: '#audit-form',
            overlay: 'medium',
            height: 'medium',
          },
          {
            blockType: 'stats',
            items: [
              { value: '7', label: 'Audit checks' },
              { value: '1', label: 'Owner handoff view' },
              { value: '24h', label: 'Follow-up promise' },
            ],
          },
          {
            blockType: 'quoteBand',
            quote: 'Wir wollten nicht nur mehr Leads, sondern besser lesbare Signale.',
            attribution: 'Client perspective',
            roleLine: 'Ops view',
            variant: 'lime',
          },
          {
            blockType: 'form',
            id: 'audit-form',
            formConfig: ctx.formIds['demo-audit'],
            width: 'wide',
          },
        ],
      },
      en: {
        seo: {
          title: 'GTM audit landing page',
          description: 'Seeded landing page for audit capture and lead qualification.',
        },
        hero: {
          headline: 'Landing page: GTM audit',
          subheadline: 'A seeded landing page for audit downloads, trust framing, and qualified form capture.',
        },
        primaryCta: { label: 'Request audit', href: '#audit-form' },
        layout: [
          {
            blockType: 'imageBanner',
            id: 'audit-visual',
            imageUrl: auditUrl,
            imageAlt: 'Audit placeholder image',
            headline: 'Offer for teardown and funnel audit',
            subheadline: 'Seeded blocks for stats, proof, FAQ, and form capture.',
            ctaLabel: 'Open form',
            ctaHref: '#audit-form',
            overlay: 'medium',
            height: 'medium',
          },
          {
            blockType: 'stats',
            items: [
              { value: '7', label: 'Audit checks' },
              { value: '1', label: 'Owner handoff view' },
              { value: '24h', label: 'Follow-up promise' },
            ],
          },
          {
            blockType: 'quoteBand',
            quote: 'We did not just want more leads, we wanted signals the team could actually read.',
            attribution: 'Client perspective',
            roleLine: 'Ops view',
            variant: 'lime',
          },
          {
            blockType: 'form',
            id: 'audit-form',
            formConfig: ctx.formIds['demo-audit'],
            width: 'wide',
          },
        ],
      },
    },
    {
      slug: 'demo-trust-conversion',
      title: 'Trust Conversion Landing',
      pageType: 'landing',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-trust-conversion' }),
        seo: {
          title: 'Trust Conversion Landing',
          description: 'Seeded landing page for trust-first conversion paths.',
        },
        hero: {
          headline: 'Landingpage: Trust Conversion',
          subheadline: 'Fur SaaS- und AI-Angebote, bei denen Vertrauen vor Geschwindigkeit kommt.',
        },
        primaryCta: { label: 'Produkt ansehen', href: '/products/demo-trust-conversion-kit' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Trust signals mussen vor dem CTA erscheinen',
            body: 'Diese seeded Landingpage zeigt comparison, FAQ und product-reference content fur trust-lastige Buyer Journeys.',
            imageUrl: conversionUrl,
            imageAlt: 'Trust conversion placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'comparison',
            sectionTitle: 'Trust comparison',
            columns: [{ heading: 'Minimal trust layer' }, { heading: 'Proof-first path' }],
            rows: [
              { label: 'Security proof', cells: [{ value: 'Versteckt' }, { value: 'Fruh sichtbar' }] },
              { label: 'Procurement friction', cells: [{ value: 'Spat erkannt' }, { value: 'Vorweggenommen' }] },
              { label: 'CTA confidence', cells: [{ value: 'Schwach' }, { value: 'Kontextstark' }] },
            ],
          },
          {
            blockType: 'cta',
            label: 'Trust Conversion Kit ansehen',
            href: '/products/demo-trust-conversion-kit',
            variant: 'secondary',
          },
          {
            blockType: 'faq',
            items: [
              { question: 'Warum seeded comparison blocks?', answer: 'Weil sie schnell zeigen, ob Tabellen, rows, and content editing im Page Builder stabil laufen.' },
            ],
          },
        ],
      },
      en: {
        seo: {
          title: 'Trust conversion landing page',
          description: 'Seeded landing page for trust-first conversion paths.',
        },
        hero: {
          headline: 'Landing page: trust conversion',
          subheadline: 'For SaaS and AI offers where trust has to show up before speed.',
        },
        primaryCta: { label: 'View product', href: '/products/demo-trust-conversion-kit' },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Trust signals should appear before the CTA',
            body: 'This seeded landing page shows comparison, FAQ, and product-reference content for trust-heavy buyer journeys.',
            imageUrl: conversionUrl,
            imageAlt: 'Trust conversion placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'comparison',
            sectionTitle: 'Trust comparison',
            columns: [{ heading: 'Minimal trust layer' }, { heading: 'Proof-first path' }],
            rows: [
              { label: 'Security proof', cells: [{ value: 'Hidden' }, { value: 'Visible early' }] },
              { label: 'Procurement friction', cells: [{ value: 'Spotted late' }, { value: 'Handled up front' }] },
              { label: 'CTA confidence', cells: [{ value: 'Weak' }, { value: 'Context-rich' }] },
            ],
          },
          {
            blockType: 'cta',
            label: 'View Trust Conversion Kit',
            href: '/products/demo-trust-conversion-kit',
            variant: 'secondary',
          },
          {
            blockType: 'faq',
            items: [
              { question: 'Why seed comparison blocks?', answer: 'Because they quickly prove whether the comparison table, rows, and page-builder editing remain stable.' },
            ],
          },
        ],
      },
    },
    {
      slug: 'demo-founder-message-lab',
      title: 'Founder Message Lab Landing',
      pageType: 'landing',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'demo-founder-message-lab' }),
        seo: {
          title: 'Founder Message Lab',
          description: 'Seeded landing page with video placeholder and discovery capture.',
        },
        hero: {
          headline: 'Landingpage: Founder Message Lab',
          subheadline: 'Video- und process-orientierte Struktur fur messaging-heavy landing flows.',
        },
        primaryCta: { label: 'Discovery starten', href: '#founder-form' },
        layout: [
          {
            blockType: 'video',
            title: 'Video placeholder',
            url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
            posterUrl: videoPosterUrl,
            width: 'wide',
            mediaAlign: 'center',
            aspectRatio: 'cinema',
          },
          {
            blockType: 'process',
            sectionTitle: 'Founder workflow',
            intro: 'Ein Beispiel fur eine page, die stark mit Ablauf, Narrative und qualification spielt.',
            steps: [
              { title: 'Founder signal', body: 'Welche Aussage muss glaubwurdig und nicht uberladen sein?' },
              { title: 'Audience filter', body: 'Wen soll diese Nachricht qualifizieren und wen eher nicht?' },
              { title: 'Follow-up path', body: 'Was passiert nach Video, CTA und Formular?' },
            ],
          },
          {
            blockType: 'form',
            id: 'founder-form',
            formConfig: ctx.formIds['demo-discovery'],
            width: 'wide',
          },
        ],
      },
      en: {
        seo: {
          title: 'Founder Message Lab',
          description: 'Seeded landing page with video placeholder and discovery capture.',
        },
        hero: {
          headline: 'Landing page: founder message lab',
          subheadline: 'Video and process-led structure for messaging-heavy landing flows.',
        },
        primaryCta: { label: 'Start discovery', href: '#founder-form' },
        layout: [
          {
            blockType: 'video',
            title: 'Video placeholder',
            url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
            posterUrl: videoPosterUrl,
            width: 'wide',
            mediaAlign: 'center',
            aspectRatio: 'cinema',
          },
          {
            blockType: 'process',
            sectionTitle: 'Founder workflow',
            intro: 'An example of a page that leans heavily on sequence, narrative, and qualification.',
            steps: [
              { title: 'Founder signal', body: 'What statement needs to feel credible and restrained?' },
              { title: 'Audience filter', body: 'Who should this message qualify, and who should it filter out?' },
              { title: 'Follow-up path', body: 'What happens after the video, CTA, and form?' },
            ],
          },
          {
            blockType: 'form',
            id: 'founder-form',
            formConfig: ctx.formIds['demo-discovery'],
            width: 'wide',
          },
        ],
      },
    },
    {
      slug: 'contact',
      title: 'Contact · The Modesty Argument',
      pageType: 'contact',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'contact' }),
        navigationLabel: 'Kontakt',
        navOrder: 30,
        seo: {
          title: 'Contact | The Modesty Argument',
          description:
            'Lassen Sie uns uber Ihr nachstes digitales Projekt, Ihre Marke oder Ihre Plattform sprechen.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'contact-hero',
            headline: 'Contact',
            subheadline:
              'Lassen Sie uns uber Ihr nachstes digitales Projekt, Ihre Marke oder Ihre Plattform sprechen.',
            ctaLabel: 'Projekt anfragen',
            ctaHref: '#contact-form',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            id: 'contact-intro',
            blockType: 'textMedia',
            headline:
              'Wenn Strategie, Gestaltung und technische Umsetzung zusammen gedacht werden sollen, ist The Modesty Argument der richtige Gesprachspartner fur den nachsten Schritt.',
            body:
              'Wir arbeiten an Marken, Websites, Apps, UX-Systemen, Content und digitalen Erlebnissen, die kreative Klarheit mit technischer Prazision verbinden. Ob erste Idee oder konkretes Vorhaben: Wir horen zu, strukturieren den Kontext und entwickeln mit Ihnen den sinnvollsten nachsten Schritt.',
            imageUrl: positioningUrl,
            imageAlt: 'Calm creative-tech contact visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            id: 'contact-form',
            blockType: 'form',
            formConfig: ctx.formIds['demo-contact'],
            width: 'full',
          },
          {
            blockType: 'iconRow',
            id: 'contact-details',
            sectionTitle: 'Kontakt und Erwartungen',
            intro:
              'Klarheit im Erstkontakt hilft beiden Seiten. Diese Angaben bleiben im CMS direkt editierbar.',
            items: [
              {
                id: 'contact-detail-1',
                icon: '◆',
                title: 'Studio',
                body: 'The Modesty Argument · Premium Creative-Tech Studio',
              },
              {
                id: 'contact-detail-2',
                icon: '◇',
                title: 'Kontakt',
                body: 'hello@tma.test · Platzhalter, in den Site Settings ersetzbar',
              },
              {
                id: 'contact-detail-3',
                icon: '○',
                title: 'Standorte',
                body: 'Munchen / Indien · kreative und technische Zusammenarbeit uber mehrere Kontexte hinweg',
              },
              {
                id: 'contact-detail-4',
                icon: '✦',
                title: 'Antwortzeit',
                body: 'In der Regel innerhalb von ein bis zwei Werktagen',
              },
            ],
          },
          {
            blockType: 'faq',
            id: 'contact-faq',
            items: [
              {
                id: 'contact-faq-1',
                question: 'Welche Projekte passen zu The Modesty Argument?',
                answer:
                  'Marken, digitale Produkte, Websites, Apps, UX-Systeme, Content- und Creative-Tech-Arbeit mit Anspruch an Klarheit, Richtung und Umsetzung.',
              },
              {
                id: 'contact-faq-2',
                question: 'Wie schnell erfolgt eine Ruckmeldung?',
                answer:
                  'In der Regel innerhalb von ein bis zwei Werktagen. Bei komplexeren Anfragen kann die erste Antwort kurz sein, der nachste Schritt aber bereits klar benannt werden.',
              },
              {
                id: 'contact-faq-3',
                question: 'Sind auch fruhe Ideen willkommen?',
                answer:
                  'Ja. Wenn ein Vorhaben noch unscharf ist, kann ein erstes Gesprach helfen, Ziele, Prioritaten und sinnvolle Optionen gemeinsam zu klaren.',
              },
              {
                id: 'contact-faq-4',
                question: 'Kann die Zusammenarbeit mit einem Workshop oder Erstgesprach starten?',
                answer:
                  'Ja. Ein strukturierter Ersttermin oder Workshop ist oft der beste Einstieg, wenn Strategie, Gestaltung und technische Umsetzung gemeinsam gedacht werden sollen.',
              },
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'contact-reassurance',
            eyebrow: 'Collaboration',
            headline: 'Wir freuen uns auf relevante Projekte mit Klarheit, Haltung und Substanz.',
            body:
              'Ob erste Idee oder konkretes Vorhaben - wir horen zu, denken mit und entwickeln gemeinsam den nachsten sinnvollen Schritt.',
            ctaLabel: 'Zum Formular',
            ctaHref: '#contact-form',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
      en: {
        navigationLabel: 'Contact',
        seo: {
          title: 'Contact | The Modesty Argument',
          description:
            'Let’s talk about your next digital project, your brand or your platform.',
        },
        layout: [
          {
            blockType: 'hero',
            id: 'contact-hero',
            headline: 'Contact',
            subheadline:
              'Let’s talk about your next digital project, your brand or your platform.',
            ctaLabel: 'Start your inquiry',
            ctaHref: '#contact-form',
            backgroundMediaUrl: heroUrl,
            height: 'medium',
            mediaFit: 'cover',
            mediaPositionX: 'center',
            mediaPositionY: 'center',
            animationPreset: 'slide-blur',
          },
          {
            id: 'contact-intro',
            blockType: 'textMedia',
            headline:
              'If strategy, design and technical execution need to be considered together, The Modesty Argument is the right conversation partner for the next step.',
            body:
              'We work across brands, websites, apps, UX systems, content and digital experiences that connect creative clarity with technical precision. Whether your idea is early or already defined, we listen closely, structure the context and help shape the next sensible move.',
            imageUrl: positioningUrl,
            imageAlt: 'Calm creative-tech contact visual',
            imagePosition: 'right',
            mediaWidth: 'wide',
            backgroundEffect: 'glass',
          },
          {
            id: 'contact-form',
            blockType: 'form',
            formConfig: ctx.formIds['demo-contact'],
            width: 'full',
          },
          {
            blockType: 'iconRow',
            id: 'contact-details',
            sectionTitle: 'Contact and expectations',
            intro:
              'A little clarity at the start helps both sides. These details remain directly editable in the CMS.',
            items: [
              {
                id: 'contact-detail-1',
                icon: '◆',
                title: 'Studio',
                body: 'The Modesty Argument · Premium creative-tech studio',
              },
              {
                id: 'contact-detail-2',
                icon: '◇',
                title: 'Contact',
                body: 'hello@tma.test · placeholder, replace in site settings',
              },
              {
                id: 'contact-detail-3',
                icon: '○',
                title: 'Locations',
                body: 'Munich / India · creative and technical collaboration across contexts',
              },
              {
                id: 'contact-detail-4',
                icon: '✦',
                title: 'Response time',
                body: 'Usually within one to two working days',
              },
            ],
          },
          {
            blockType: 'faq',
            id: 'contact-faq',
            items: [
              {
                id: 'contact-faq-1',
                question: 'What kinds of projects are a strong fit?',
                answer:
                  'Brands, digital products, websites, apps, UX systems, content and creative-tech work that call for clarity, direction and thoughtful execution.',
              },
              {
                id: 'contact-faq-2',
                question: 'How quickly do you usually reply?',
                answer:
                  'Usually within one to two working days. For more complex inquiries, the first reply may be short but the next step will already be clear.',
              },
              {
                id: 'contact-faq-3',
                question: 'Are early-stage ideas welcome?',
                answer:
                  'Yes. A first conversation can be the right place to clarify goals, priorities and realistic options when a project is still taking shape.',
              },
              {
                id: 'contact-faq-4',
                question: 'Can collaboration start with a workshop or first conversation?',
                answer:
                  'Yes. A structured first session or workshop is often the best way to start when strategy, design and technical execution need to align.',
              },
            ],
          },
          {
            blockType: 'promoBanner',
            id: 'contact-reassurance',
            eyebrow: 'Collaboration',
            headline: 'We welcome meaningful projects shaped by clarity, intention and substance.',
            body:
              'Whether your idea is still early or already concrete, we listen, think with you and define the next useful step together.',
            ctaLabel: 'Go to form',
            ctaHref: '#contact-form',
            variant: 'gradient',
            align: 'left',
          },
        ],
      },
    },
    {
      slug: 'thanks',
      title: 'Thank You',
      pageType: 'other',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'thanks' }),
        seo: {
          title: 'Danke-Seite',
          description: 'Seeded thank-you page for forms and booking flows.',
        },
        hero: {
          headline: 'Danke - Ihre Anfrage ist eingegangen',
          subheadline: 'Nutze diese Seite fur Follow-up Hinweise, Downloads oder einen zweiten CTA.',
        },
        layout: [
          {
            blockType: 'quoteBand',
            quote: 'Ein gutes Thank-you ist kein Sackgassen-Screen.',
            attribution: 'The Modesty Argument',
            variant: 'border',
          },
          {
            blockType: 'cta',
            label: 'Zuruck zur Startseite',
            href: '/',
            variant: 'ghost',
          },
          {
            blockType: 'cta',
            label: 'Produktseite offnen',
            href: '/products/demo-ai-positioning-sprint',
            variant: 'secondary',
          },
        ],
      },
      en: {
        seo: {
          title: 'Thank-you page',
          description: 'Seeded thank-you page for forms and booking flows.',
        },
        hero: {
          headline: 'Thanks - your inquiry is complete',
          subheadline: 'Use this page for follow-up guidance, downloads, or a second CTA.',
        },
        layout: [
          {
            blockType: 'quoteBand',
            quote: 'A good thank-you page should not feel like a dead end.',
            attribution: 'The Modesty Argument',
            variant: 'border',
          },
          {
            blockType: 'cta',
            label: 'Back to homepage',
            href: '/',
            variant: 'ghost',
          },
          {
            blockType: 'cta',
            label: 'Open product page',
            href: '/products/demo-ai-positioning-sprint',
            variant: 'secondary',
          },
        ],
      },
    },
    {
      slug: 'legal',
      title: 'Legal',
      pageType: 'legal',
      status: 'published',
      de: {
        ...commonLocalization,
        ...demoSeedMeta('page', { slug: 'legal' }),
        seo: {
          title: 'Rechtliches',
          description: 'Rechtliche Informationen und Hinweise.',
        },
        hero: {
          headline: 'Rechtliches',
          subheadline:
            'Impressum, Datenschutz und weitere rechtliche Hinweise konnen hier zentral gepflegt werden.',
        },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Rechtliche Inhalte an einem Ort',
            body: 'Diese Seite ist als editierbare rechtliche Sammelseite angelegt. Inhalte wie Impressum, Datenschutz und weitere Hinweise konnen direkt im CMS gepflegt und bei Bedarf erweitert werden.',
            imageUrl: sprintUrl,
            imageAlt: 'Legal placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'download',
            downloadAssetId: ctx.downloadAssetId,
          },
        ],
      },
      en: {
        seo: {
          title: 'Legal',
          description: 'Legal information and notices.',
        },
        hero: {
          headline: 'Legal',
          subheadline:
            'Imprint, privacy, and other legal notices can be maintained here in one central place.',
        },
        layout: [
          {
            blockType: 'textMedia',
            headline: 'Legal content in one place',
            body: 'This page is set up as an editable legal hub. Content such as imprint, privacy, and other notices can be maintained directly in the CMS and expanded as needed.',
            imageUrl: sprintUrl,
            imageAlt: 'Legal placeholder',
            imagePosition: 'right',
          },
          {
            blockType: 'download',
            downloadAssetId: ctx.downloadAssetId,
          },
        ],
      },
    },
  ]

  return pages
}

async function upsertPage(
  db: CustomDb,
  def: ReturnType<typeof buildPageDocuments>[number],
): Promise<number> {
  const pageDocument = embedPageLocalization(def.de, def.en)
  const existing = await db
    .select({
      id: cmsPages.id,
      title: cmsPages.title,
      document: cmsPages.document,
    })
    .from(cmsPages)
    .where(eq(cmsPages.slug, def.slug))
    .limit(1)

  if (existing[0]) {
    const row = existing[0]
    if (!row.title.startsWith('Demo ·') && !isDemoManagedDocument(row.document)) {
      return row.id
    }
    await db
      .update(cmsPages)
      .set({
        pageType: def.pageType,
        status: def.status,
        title: def.title,
        document: pageDocument,
        isDemoContent: true,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, row.id))
    return row.id
  }

  const [row] = await db
    .insert(cmsPages)
    .values({
      slug: def.slug,
      pageType: def.pageType,
      status: def.status,
      title: def.title,
      document: pageDocument,
      isDemoContent: true,
    })
    .returning({ id: cmsPages.id })
  return row!.id
}

async function upsertPageLocalization(
  db: CustomDb,
  pageId: number,
  locale: 'en',
  doc: Record<string, unknown> | undefined,
) {
  if (!doc) return
  const heroBlock =
    Array.isArray(doc.layout) && doc.layout.length > 0
      ? doc.layout.find(
          (block): block is Record<string, unknown> =>
            isRecord(block) && block.blockType === 'hero',
        ) ?? null
      : null
  const rows = await db
    .select({ id: cmsPageLocalizations.id, locale: cmsPageLocalizations.locale })
    .from(cmsPageLocalizations)
    .where(eq(cmsPageLocalizations.pageId, pageId))
  const exact = rows.find((row) => row.locale === locale)

  const payload = {
    sourceLocale: 'de',
    jobStatus: 'ready',
    lastError: null,
    heroHeadline:
      isRecord(doc.hero) && typeof doc.hero.headline === 'string'
        ? doc.hero.headline
        : heroBlock && typeof heroBlock.headline === 'string'
          ? heroBlock.headline
          : null,
    heroSubheadline:
      isRecord(doc.hero) && typeof doc.hero.subheadline === 'string'
        ? doc.hero.subheadline
        : heroBlock && typeof heroBlock.subheadline === 'string'
          ? heroBlock.subheadline
        : null,
    seoTitle: isRecord(doc.seo) && typeof doc.seo.title === 'string' ? doc.seo.title : null,
    seoDescription:
      isRecord(doc.seo) && typeof doc.seo.description === 'string'
        ? doc.seo.description
        : null,
    layoutJson: Array.isArray(doc.layout) ? doc.layout : null,
    layoutNotes: 'Seeded ready localization row.',
    updatedAt: new Date(),
  }

  if (exact) {
    await db
      .update(cmsPageLocalizations)
      .set(payload)
      .where(eq(cmsPageLocalizations.id, exact.id))
    return
  }

  await db.insert(cmsPageLocalizations).values({
    pageId,
    locale,
    ...payload,
  })
}

function isDemoSiteSettings(document: Record<string, unknown>) {
  const branding = isRecord(document.branding) ? document.branding : null
  const logoLightUrl = typeof branding?.logoLightUrl === 'string' ? branding.logoLightUrl : ''
  const header = isRecord(document.header) ? document.header : null
  const announcement = isRecord(header?.announcement) ? header.announcement : null
  return (
    logoLightUrl.includes('/demo/placeholders/') ||
    (typeof announcement?.text === 'string' && announcement.text.includes('Demo-Inhalt'))
  )
}

async function ensureSiteSettings(db: CustomDb) {
  const row = await ensureSiteSettingsRow(db)
  const current = parseSiteSettingsDocument(row.document)
  const replaceAll = force && isDemoSiteSettings(row.document as Record<string, unknown>)
  const shouldRefreshSeededSettings = replaceAll || isDemoSiteSettings(row.document as Record<string, unknown>)
  const patch: SiteSettingsPatchDocument = {}

  if (shouldRefreshSeededSettings || !current.defaultTitle) {
    patch.defaultTitle = 'The Modesty Argument'
  }
  if (shouldRefreshSeededSettings || !current.defaultDescription) {
    patch.defaultDescription =
      'Creative-tech studio website with CMS-driven pages, products, forms, booking, media, and bilingual content.'
  }
  if (shouldRefreshSeededSettings || !current.titleTemplate) {
    patch.titleTemplate = '%s - The Modesty Argument'
  }
  if (shouldRefreshSeededSettings || !current.ogImageUrl) {
    patch.ogImageUrl = '/demo/placeholders/hero-foundation.svg'
  }
  if (replaceAll || !current.layout?.sectionPaddingY) {
    patch.layout = {
      ...(patch.layout ?? {}),
      sectionPaddingY: 'clamp(2.75rem, 7vw, 5rem)',
    }
  }

  const shouldSeedBranding = shouldRefreshSeededSettings || !current.branding?.logoLightUrl
  if (shouldSeedBranding) {
    patch.branding = {
      siteName: 'The Modesty Argument',
      logoLightUrl: '/demo/placeholders/logo-light.svg',
      logoDarkUrl: '/demo/placeholders/logo-dark.svg',
      faviconUrl: '/demo/placeholders/logo-dark.svg',
    }
  }

  const shouldSeedHeader =
    replaceAll || isDemoSiteSettings(row.document as Record<string, unknown>) || !current.header?.navigationItems?.length
  if (shouldSeedHeader) {
    patch.header = {
      navUtilityLabel: 'Erstgesprach',
      navUtilityLabelEn: 'Book a call',
      navUtilityHref: '/book/demo-strategy-call',
      navUtilityStyle: 'ghost',
      navCtaLabel: 'Gesprach buchen',
      navCtaLabelEn: 'Book a call',
      navCtaHref: '/book/demo-strategy-call',
      navCtaStyle: 'primary',
      logoLightUrl: '/demo/placeholders/logo-light.svg',
      logoDarkUrl: '/demo/placeholders/logo-dark.svg',
      logoAlt: 'The Modesty Argument logo',
      logoWidthDesktop: 184,
      logoWidthMobile: 144,
      sticky: true,
      transparentOnHero: false,
      layout: 'split',
      mobileBehavior: 'drawer',
      announcement: {
        enabled: true,
        text: 'Inhalte und Strukturen sind direkt im CMS editierbar.',
        textEn: 'Content and structure are directly editable in the CMS.',
        href: '/services',
        style: 'highlight',
        mode: 'static',
        speed: 'normal',
        pauseOnHover: true,
      },
      navigationItems: [
        { id: 'nav-services', type: 'page', href: '/services', label: 'Leistungen', labelEn: 'Services', showOnDesktop: true, showOnMobile: true },
        { id: 'nav-about', type: 'page', href: '/about', label: 'Uber uns', labelEn: 'About', showOnDesktop: true, showOnMobile: true },
        { id: 'nav-work', type: 'page', href: '/work', label: 'Work', labelEn: 'Work', showOnDesktop: true, showOnMobile: true },
        { id: 'nav-projects', type: 'page', href: '/projects', label: 'Projekte', labelEn: 'Projects', showOnDesktop: true, showOnMobile: true },
        { id: 'nav-news', type: 'page', href: '/news', label: 'News', labelEn: 'News', showOnDesktop: true, showOnMobile: true },
        { id: 'nav-contact', type: 'page', href: '/contact', label: 'Kontakt', labelEn: 'Contact', showOnDesktop: true, showOnMobile: true },
      ],
    }
  }

  if (replaceAll || isDemoSiteSettings(row.document as Record<string, unknown>) || !current.cookieConsent?.title) {
    patch.cookieConsent = {
      enabled: true,
      title: 'Cookies und Datenschutz',
      titleEn: 'Cookies and privacy',
      body: 'Wir verwenden optionale Analyse-Cookies nur nach Ihrer Einwilligung. Notwendige Cookies bleiben fur Sprache und Grundfunktionen aktiv.',
      bodyEn: 'We use optional analytics cookies only after your consent. Essential cookies remain active for language and core site functions.',
      acceptLabel: 'Analyse erlauben',
      acceptLabelEn: 'Accept analytics',
      rejectLabel: 'Nur notwendige Cookies',
      rejectLabelEn: 'Only essential cookies',
      policyHref: '/legal',
      policyLabel: 'Datenschutz',
      policyLabelEn: 'Privacy policy',
    }
  }

  const shouldSeedFooter = shouldRefreshSeededSettings || !current.footer?.legalLinks?.length
  if (shouldSeedFooter) {
    patch.footer = {
      straplineOverride:
        'CMS-gesteuerte Seiten, Formulare, Buchung und Platzhalter-Medien.',
      straplineOverrideEn:
        'CMS-driven pages, forms, booking, and placeholder media.',
      logoUrl: '/demo/placeholders/logo-dark.svg',
      logoAlt: 'The Modesty Argument logo',
      logoWidth: 160,
      layout: 'columns',
      ctaLabel: 'Gesprach buchen',
      ctaLabelEn: 'Book a call',
      ctaHref: '/book/demo-strategy-call',
      ctaStyle: 'secondary',
      metaLine: 'German-first content foundation with English overlays.',
      metaLineEn: 'German-first content foundation with English overlays.',
      showContact: true,
      showSocialLinks: true,
      contact: {
        companyName: 'The Modesty Argument',
        email: 'hello@tma.test',
        phone: '+49 30 5555 0000',
        address: 'Munich / India',
      },
      socialLinks: [
        { platform: 'linkedin', url: 'https://linkedin.com/company/openai', label: 'LinkedIn' },
      ],
      legalLinks: [
        { label: 'Impressum', href: '/legal' },
        { label: 'Datenschutz', href: '/legal' },
      ],
    }
  }

  if (shouldRefreshSeededSettings || !current.contactInfo?.email) {
    patch.contactInfo = {
      companyName: 'The Modesty Argument',
      email: 'hello@tma.test',
      phone: '+49 30 5555 0000',
      address: 'Munich / India',
    }
  }

  if (replaceAll || !current.socialLinks?.length) {
    patch.socialLinks = [{ platform: 'linkedin', url: 'https://linkedin.com/company/openai', label: 'LinkedIn' }]
  }

  const merged = mergeSiteSettingsDocumentPatch(current, patch)
  if (!merged.ok) {
    throw new Error(`Could not merge demo site settings: ${merged.message}`)
  }

  if (JSON.stringify(merged.document) !== JSON.stringify(current)) {
    await updateSiteSettingsDocument(db, merged.document)
  }
}

async function ensurePages(db: CustomDb, ctx: Parameters<typeof buildPageDocuments>[0]) {
  const pageDefs = buildPageDocuments(ctx)
  for (const def of pageDefs) {
    const pageId = await upsertPage(db, def)
    await upsertPageLocalization(db, pageId, 'en', def.en)
  }
}

async function ensureSampleLeads(
  db: CustomDb,
  services: Record<string, number>,
  industries: Record<string, number>,
  bookingProfiles: Record<string, number>,
) {
  const now = Date.now()
  const defs = [
    {
      email: 'maria@demo.tma.test',
      firstName: 'Maria',
      lastName: 'Stern',
      phone: '+49 170 1111111',
      company: 'Atlas Neural',
      website: 'https://atlas.demo',
      serviceInterestId: services['demo-ai-positioning'],
      industryId: industries['demo-ai-platforms'],
      sourcePageSlug: 'demo-gtm-audit',
      formType: 'demo-audit',
      bookingStatus: 'none',
      owner: 'alina.demo',
      leadStatus: 'qualified',
      crmSyncStatus: 'pending',
      notes: 'Seeded hot lead used to populate dashboard metrics.',
      consentMarketing: true,
      idempotencyKey: 'demo-seed:lead:maria',
      submissionExtras: {
        service: 'AI positioning',
        message: 'We want tighter proof and buyer-facing messaging.',
      },
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      email: 'jonas@demo.tma.test',
      firstName: 'Jonas',
      lastName: 'Voss',
      phone: '+49 170 2222222',
      company: 'HelixFlow',
      website: 'https://helix.demo',
      serviceInterestId: services['demo-demand-systems'],
      industryId: industries['demo-developer-tools'],
      sourcePageSlug: 'contact',
      formType: 'demo-contact',
      bookingStatus: 'started',
      owner: 'daniel.demo',
      leadStatus: 'contacted',
      crmSyncStatus: 'synced',
      notes: 'Seeded contacted lead for list density.',
      consentMarketing: false,
      idempotencyKey: 'demo-seed:lead:jonas',
      submissionExtras: {
        service: 'Demand systems',
        message: 'Need a better landing path from paid to booked meetings.',
      },
      createdAt: new Date(now - 28 * 60 * 60 * 1000),
    },
    {
      email: 'elena@demo.tma.test',
      firstName: 'Elena',
      lastName: 'Kraft',
      phone: '+49 170 3333333',
      company: 'Northgate Grid',
      website: 'https://northgate.demo',
      serviceInterestId: services['demo-revops-instrumentation'],
      industryId: industries['demo-regulated-saas'],
      sourcePageSlug: 'home',
      formType: 'internal_booking',
      bookingStatus: 'scheduled',
      owner: 'leonie.demo',
      leadStatus: 'new',
      crmSyncStatus: 'pending',
      notes: 'Seeded booking lead for upcoming booking card.',
      consentMarketing: true,
      idempotencyKey: 'demo-seed:lead:elena',
      submissionExtras: {
        service: 'RevOps instrumentation',
        message: 'We need clearer ownership and pipeline visibility.',
      },
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      bookingProfileId: bookingProfiles['demo-strategy-call'],
    },
  ] as const

  const leadIds: Record<string, number> = {}

  for (const def of defs) {
    const existing = await db
      .select({ id: cmsLeads.id })
      .from(cmsLeads)
      .where(eq(cmsLeads.email, def.email))
      .limit(1)
    if (existing[0]) {
      leadIds[def.email] = existing[0].id
      await db
        .update(cmsLeads)
        .set({
          firstName: def.firstName,
          lastName: def.lastName,
          phone: def.phone,
          company: def.company,
          website: def.website,
          serviceInterestId: def.serviceInterestId,
          industryId: def.industryId,
          sourcePageSlug: def.sourcePageSlug,
          formType: def.formType,
          bookingStatus: def.bookingStatus,
          owner: def.owner,
          leadStatus: def.leadStatus,
          crmSyncStatus: def.crmSyncStatus,
          notes: def.notes,
          consentMarketing: def.consentMarketing,
          idempotencyKey: def.idempotencyKey,
          submissionExtras: def.submissionExtras,
          isDemoContent: true,
          updatedAt: new Date(),
        })
        .where(eq(cmsLeads.id, existing[0].id))
      continue
    }
    const [row] = await db
      .insert(cmsLeads)
      .values({
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
        phone: def.phone,
        company: def.company,
        website: def.website,
        serviceInterestId: def.serviceInterestId,
        industryId: def.industryId,
        sourcePageSlug: def.sourcePageSlug,
        formType: def.formType,
        bookingStatus: def.bookingStatus,
        owner: def.owner,
        leadStatus: def.leadStatus,
        crmSyncStatus: def.crmSyncStatus,
        notes: def.notes,
        consentMarketing: def.consentMarketing,
        idempotencyKey: def.idempotencyKey,
        submissionExtras: def.submissionExtras,
        isDemoContent: true,
        createdAt: def.createdAt,
        updatedAt: def.createdAt,
      })
      .returning({ id: cmsLeads.id })
    leadIds[def.email] = row!.id
  }

  const bookingLeadId = leadIds['elena@demo.tma.test']
  if (bookingLeadId) {
    const existingBooking = await db
      .select({ id: cmsBookingEvents.id })
      .from(cmsBookingEvents)
      .where(eq(cmsBookingEvents.leadId, bookingLeadId))
      .limit(1)
    const scheduledFor = new Date(now + 2 * 24 * 60 * 60 * 1000)
    if (existingBooking[0]) {
      await db
        .update(cmsBookingEvents)
        .set({
          bookingProfileId: bookingProfiles['demo-strategy-call'],
          providerEventId: 'demo-seed:booking:elena',
          scheduledFor,
          status: 'confirmed',
          rawPayload: {
            source: 'demo-seed',
            note: 'Seeded booking event',
          },
          updatedAt: new Date(),
        })
        .where(eq(cmsBookingEvents.id, existingBooking[0].id))
    } else {
      await db.insert(cmsBookingEvents).values({
        leadId: bookingLeadId,
        bookingProfileId: bookingProfiles['demo-strategy-call'],
        providerEventId: 'demo-seed:booking:elena',
        scheduledFor,
        status: 'confirmed',
        rawPayload: {
          source: 'demo-seed',
          note: 'Seeded booking event',
        },
      })
    }
  }

  const crmLeadId = leadIds['maria@demo.tma.test']
  if (crmLeadId) {
    const existingLog = await db
      .select({ id: cmsCrmSyncLogs.id })
      .from(cmsCrmSyncLogs)
      .where(eq(cmsCrmSyncLogs.leadId, crmLeadId))
      .limit(1)
    if (existingLog[0]) {
      await db
        .update(cmsCrmSyncLogs)
        .set({
          targetSystem: 'zoho',
          status: 'failed',
          payload: { source: 'demo-seed', leadEmail: 'maria@demo.tma.test' },
          response: { error: 'Demo sync failure for dashboard visibility' },
          syncedAt: new Date(),
          createdAt: new Date(),
        })
        .where(eq(cmsCrmSyncLogs.id, existingLog[0].id))
    } else {
      await db.insert(cmsCrmSyncLogs).values({
        leadId: crmLeadId,
        targetSystem: 'zoho',
        status: 'failed',
        payload: { source: 'demo-seed', leadEmail: 'maria@demo.tma.test' },
        response: { error: 'Demo sync failure for dashboard visibility' },
        syncedAt: new Date(),
      })
    }
  }
}

export async function seedCmsDemo(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const db = getCustomDb()
  if (!db) {
    console.error('Could not open Drizzle client.')
    process.exit(1)
  }

  await maybeDeleteDemoRows(db)

  const media = await ensureMedia(db)
  await ensureEmailTemplates(db)
  const services = await ensureServices(db)
  const industries = await ensureIndustries(db)
  const testimonials = await ensureTestimonials(db, media)
  const faqIds = await ensureFaqEntries(db)
  const teamIds = await ensureTeam(db, media)
  const downloadAssetId = await ensureDownloadAsset(db)
  const caseStudyIds = await ensureCaseStudies(db, industries, media)
  const formIds = await ensureFormConfigs(db)
  const bookingIds = await ensureBookingProfiles(db)
  const productIds = await ensureProducts(db)
  await ensureSiteSettings(db)
  await ensurePages(db, {
    media,
    testimonials,
    faqIds,
    downloadAssetId,
    formIds,
    bookingIds,
    caseStudyIds,
    teamIds,
    productIds,
  })
  await ensureSampleLeads(db, services, industries, bookingIds)

  const origin = (
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4069'
  ).replace(/\/$/, '')
  console.info(
    `CMS demo seeded. Open ${origin}/, ${origin}/services, ${origin}/demo-gtm-audit, ${origin}/products/demo-ai-positioning-sprint, and ${origin}/console.`,
  )
}
