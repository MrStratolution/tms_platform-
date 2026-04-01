/**
 * Inserts demo CMS rows into `tma_custom` (pages, forms, booking, email templates, product, optional media).
 *
 * Idempotent:
 * - Skips when the `home` page exists (unless `--force`).
 * - If templates exist but pages are missing, backfills pages/form/booking/product without deleting data.
 * - Use `--force` to remove demo slugs and re-seed from scratch.
 */
import { config as loadEnv } from 'dotenv'
import { eq, inArray } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath } from 'url'

import { getCustomDb } from '../src/db/client'
import {
  cmsAbVariants,
  cmsBookingProfiles,
  cmsEmailTemplates,
  cmsFormConfigs,
  cmsMedia,
  cmsPageLocalizations,
  cmsPages,
  cmsProducts,
} from '../src/db/schema'
import type { BookingProfile, FormConfig, Media, Page, Testimonial } from '../src/types/cms'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(projectRoot, '.env') })

type CustomDb = NonNullable<ReturnType<typeof getCustomDb>>

const DEMO_PAGE_SLUGS = ['home', 'services', 'book-call', 'contact', 'thanks'] as const
const force = process.argv.includes('--force')

function nowIso() {
  return new Date().toISOString()
}

function brandMedia(partial: Omit<Media, 'updatedAt' | 'createdAt'>): Media {
  const t = nowIso()
  return { ...partial, updatedAt: t, createdAt: t }
}

function demoTestimonial(partial: Omit<Testimonial, 'updatedAt' | 'createdAt'>): Testimonial {
  const t = nowIso()
  return { ...partial, updatedAt: t, createdAt: t }
}

async function deleteDemoArtifacts(db: CustomDb): Promise<void> {
  const pageRows = await db
    .select({ id: cmsPages.id })
    .from(cmsPages)
    .where(inArray(cmsPages.slug, [...DEMO_PAGE_SLUGS]))
  const pageIds = pageRows.map((r) => r.id)
  if (pageIds.length > 0) {
    await db.delete(cmsAbVariants).where(inArray(cmsAbVariants.pageId, pageIds))
    await db
      .delete(cmsPageLocalizations)
      .where(inArray(cmsPageLocalizations.pageId, pageIds))
    await db.delete(cmsPages).where(inArray(cmsPages.slug, [...DEMO_PAGE_SLUGS]))
  }
  await db.delete(cmsFormConfigs).where(eq(cmsFormConfigs.formType, 'contact'))
  await db
    .delete(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.internalSlug, 'strategy-call'))
  await db
    .delete(cmsEmailTemplates)
    .where(inArray(cmsEmailTemplates.slug, ['lead-thanks', 'booking-confirmed']))
  await db.delete(cmsProducts).where(eq(cmsProducts.slug, 'ai-positioning-sprint'))
}

async function ensureEmailTemplates(db: CustomDb): Promise<{ thanksId: number; bookingId: number }> {
  let thanksRow = await db
    .select({ id: cmsEmailTemplates.id })
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.slug, 'lead-thanks'))
    .limit(1)
  if (!thanksRow[0]) {
    const [row] = await db
      .insert(cmsEmailTemplates)
      .values({
        slug: 'lead-thanks',
        name: 'Lead autoresponder',
        subject: 'Thanks — we received your note, {{firstName}}',
        body: `Hi {{firstName}},

Thanks for reaching out to The Modesty Argument. We've logged your request and someone from the team will follow up shortly.

If you're building an AI product, a sentence on your buyer (e.g. developers vs. enterprise IT) helps us respond faster.

— TMA`,
      })
      .returning({ id: cmsEmailTemplates.id })
    thanksRow = [row!]
  }

  let bookingTplRow = await db
    .select({ id: cmsEmailTemplates.id })
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.slug, 'booking-confirmed'))
    .limit(1)
  if (!bookingTplRow[0]) {
    const [row] = await db
      .insert(cmsEmailTemplates)
      .values({
        slug: 'booking-confirmed',
        name: 'Booking confirmed',
        subject: 'Confirmed: {{bookingProfileName}} on {{scheduledFor}}',
        body: `Hi {{firstName}},

Your session is confirmed.

When: {{scheduledFor}}
Duration: {{durationMinutes}} minutes
Profile: {{bookingProfileName}}

We look forward to speaking with you.

— TMA`,
      })
      .returning({ id: cmsEmailTemplates.id })
    bookingTplRow = [row!]
  }

  return { thanksId: thanksRow[0]!.id, bookingId: bookingTplRow[0]!.id }
}

async function ensureContactForm(db: CustomDb, thanksId: number) {
  const existing = await db
    .select()
    .from(cmsFormConfigs)
    .where(eq(cmsFormConfigs.formType, 'contact'))
    .limit(1)
  if (existing[0]) return existing[0]

  const [row] = await db
    .insert(cmsFormConfigs)
    .values({
      formType: 'contact',
      active: true,
      document: {
        name: 'Contact — general',
        formType: 'contact',
        fields: [
          { name: 'firstName', type: 'text', label: 'First name', required: true },
          { name: 'lastName', type: 'text', label: 'Last name', required: false },
          { name: 'email', type: 'email', label: 'Work email', required: true },
          { name: 'company', type: 'text', label: 'Company', required: true },
          {
            name: 'message',
            type: 'textarea',
            label: 'What should we know? (e.g. buyer, AI use case, stage)',
            required: false,
          },
        ],
        destination: { notifyEmails: [] },
        autoresponderTemplate: thanksId,
        spamProtection: {},
        active: true,
      },
    })
    .returning()
  return row!
}

async function ensureBookingProfile(db: CustomDb, bookingTplId: number) {
  const existing = await db
    .select()
    .from(cmsBookingProfiles)
    .where(eq(cmsBookingProfiles.internalSlug, 'strategy-call'))
    .limit(1)
  if (existing[0]) return existing[0]

  const [row] = await db
    .insert(cmsBookingProfiles)
    .values({
      internalSlug: 'strategy-call',
      active: true,
      document: {
        name: 'AI / B2B strategy intro call',
        provider: 'internal',
        internalSlug: 'strategy-call',
        durationMinutes: 30,
        availability: {
          windows: [
            { weekday: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
            { weekday: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
            { weekday: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
            { weekday: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
            { weekday: 5, startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
          ],
          slotStepMinutes: 30,
        },
        thankYouPageSlug: 'thanks',
        confirmationEmailTemplate: bookingTplId,
        assignedOwner: 'TMA strategy team',
        active: true,
      },
    })
    .returning()
  return row!
}

function toFormFull(formRow: Awaited<ReturnType<typeof ensureContactForm>>): FormConfig {
  const formDoc = formRow.document as Omit<FormConfig, 'id' | 'updatedAt' | 'createdAt'>
  return {
    ...formDoc,
    id: formRow.id,
    updatedAt: formRow.updatedAt.toISOString(),
    createdAt: formRow.createdAt.toISOString(),
  }
}

function toBookingFull(bookingRow: Awaited<ReturnType<typeof ensureBookingProfile>>): BookingProfile {
  const bookingDoc = bookingRow.document as Omit<
    BookingProfile,
    'id' | 'updatedAt' | 'createdAt'
  >
  return {
    ...bookingDoc,
    id: bookingRow.id,
    updatedAt: bookingRow.updatedAt.toISOString(),
    createdAt: bookingRow.createdAt.toISOString(),
  }
}

function buildDemoPageDocuments(
  formFull: FormConfig,
  bookingFull: BookingProfile,
): {
  homeDoc: Partial<Page>
  servicesDoc: Partial<Page>
  bookCallDoc: Partial<Page>
  contactDoc: Partial<Page>
  thanksDoc: Partial<Page>
} {
  const logoWhite = brandMedia({
    id: 1,
    alt: 'TMA wordmark — white',
    url: '/brand/tma-logo-white.png',
  })
  const logoBlack = brandMedia({
    id: 2,
    alt: 'TMA wordmark — black',
    url: '/brand/tma-logo-black.png',
  })

  const testimonials = [
    demoTestimonial({
      id: 1,
      quote:
        'We were drowning in generic “AI” claims. TMA helped us tie every headline to benchmarks and customer outcomes our AEs could repeat in enterprise calls.',
      author: 'Elena Marquez',
      role: 'VP Marketing',
      company: 'LatticeMind (AI analytics)',
      active: true,
    }),
    demoTestimonial({
      id: 2,
      quote:
        'Developer marketing is easy to get loud and wrong. They sharpened our docs narrative and our paid creative so POC requests doubled — without hype.',
      author: 'James Okonkwo',
      role: 'CEO',
      company: 'HelixPipe (LLM infra)',
      active: true,
    }),
    demoTestimonial({
      id: 3,
      quote:
        'Security and legal actually signed off on our launch site. One coherent story from trust center to ROI — rare in our space.',
      author: 'Sarah Chen',
      role: 'Head of Growth',
      company: 'Northgate Copilot (regulated vertical)',
      active: true,
    }),
  ]

  const homeDoc: Partial<Page> = {
    seo: {
      title: 'The Modesty Argument — GTM for AI tools & skeptical B2B buyers',
      description:
        'Positioning, demand, and narrative for AI-native products: proof over hype, one story from website to procurement. Strategy, creative, RevOps.',
    },
    hero: {
      headline: 'Ship AI GTM that passes procurement, not just Twitter',
      subheadline:
        'Positioning, demand, and narrative for B2B AI teams: defensible claims, proof buyers can verify, and one story from website to security review.',
      backgroundMedia: logoBlack,
    },
    primaryCta: { label: 'Book a strategy call', href: '/book/strategy-call' },
    layout: [
      {
        blockType: 'stats',
        variant: 'default',
        items: [
          { value: '2.4', suffix: 'x', label: 'Average pipeline lift after narrative + demand alignment' },
          { value: '40', suffix: '%', label: 'Lower cost per qualified opportunity (blended programs)' },
          { value: '12', suffix: '', label: 'Markets and buying motions supported in the last 24 months' },
        ],
      },
      {
        blockType: 'iconRow',
        id: 'home-icon-row',
        sectionTitle: 'What you get',
        intro: 'Built for teams shipping AI into skeptical enterprise and developer markets.',
        items: [
          {
            id: 'ir1',
            icon: '◆',
            title: 'Defensible narrative',
            body: 'Claims tied to proof buyers can verify — not generic “AI” hype.',
          },
          {
            id: 'ir2',
            icon: '◇',
            title: 'One story end-to-end',
            body: 'Site, ads, and sales decks stay aligned so AEs repeat the same story.',
          },
          {
            id: 'ir3',
            icon: '○',
            title: 'Pipeline you can read',
            body: 'Instrumentation from first touch through long eval cycles.',
          },
        ],
      },
      {
        blockType: 'promoBanner',
        id: 'home-promo',
        eyebrow: 'For GTM leaders',
        headline: 'Turn technical depth into a story buyers repeat',
        body: 'Use this band between major sections — offers, events, or a single next step.',
        ctaLabel: 'See how we work',
        ctaHref: '/services',
        variant: 'gradient',
        align: 'center',
      },
      {
        blockType: 'quoteBand',
        id: 'home-quote',
        quote: 'Restraint reads as confidence to technical and economic buyers.',
        attribution: 'Sarah Chen',
        roleLine: 'Head of Growth · Northgate Copilot',
        variant: 'lime',
      },
      {
        blockType: 'process',
        id: 'home-process',
        sectionTitle: 'How engagements run',
        intro:
          'A typical arc from story to pipeline: narrative clarity first, then demand and creative, then instrumentation so marketing and sales stay aligned.',
        steps: [
          {
            id: 'p1',
            badge: '01',
            title: 'Narrative sprint',
            body: 'Lock ICP, claims you can defend, and the proof buyers need (security, ROI, references).',
          },
          {
            id: 'p2',
            badge: '02',
            title: 'Demand & creative',
            body: 'Campaigns and landing paths that match what AEs say on live calls — no mixed messages.',
          },
          {
            id: 'p3',
            badge: '03',
            title: 'RevOps loop',
            body: 'Attribution and handoffs so marketing spend maps to evals, not just MQL noise.',
          },
        ],
      },
      { blockType: 'proofBar', logos: [logoWhite, logoBlack] },
      { blockType: 'testimonialSlider', testimonials },
      {
        blockType: 'imageBanner',
        id: 'home-image-banner',
        imageUrl:
          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80',
        imageAlt: 'Team collaborating around a laptop',
        headline: 'From narrative sprint to live campaigns',
        subheadline:
          'Swap this image and copy in the console — full-bleed bands add rhythm to long pages.',
        ctaLabel: 'View services',
        ctaHref: '/services',
        overlay: 'medium',
        height: 'medium',
      },
      {
        blockType: 'cta',
        label: 'Explore services for AI & developer platforms',
        href: '/services',
        variant: 'secondary',
      },
      {
        blockType: 'faq',
        items: [
          {
            question: 'What does “modesty” mean when everyone is shouting “AI”?',
            answer:
              'We help you say exactly what your models or workflows do well — with boundaries buyers can verify (evals, security docs, references). Restraint reads as confidence to technical and economic buyers.',
          },
          {
            question: 'Do you work with both PLG and enterprise AI sales?',
            answer:
              'Yes. We align self-serve and top-down motion so docs, ads, and sales decks don’t contradict each other — critical when procurement joins mid-flight.',
          },
          {
            question: 'Do you run paid media in-house?',
            answer:
              'Search, social, and partner programs — wired to the same messaging spine so creative, landing pages, and sales enablement stay consistent.',
          },
          {
            question: 'How fast can we start?',
            answer:
              'Most engagements open with a 2-week narrative sprint (ICP, claims, proof), then expand into demand or RevOps depending on where the funnel leaks.',
          },
        ],
      },
      { blockType: 'form', formConfig: formFull },
      { blockType: 'booking', bookingProfile: bookingFull },
    ],
    defaultFormConfig: formFull,
    defaultBookingProfile: bookingFull,
    tracking: { offer: 'demo', industry: 'ai-tools' },
  }

  const servicesDoc: Partial<Page> = {
    navigationLabel: 'Services',
    navOrder: 10,
    seo: {
      title: 'Services — GTM for AI products, demand, RevOps, narrative',
      description:
        'Positioning, demand gen, RevOps, and executive storytelling for AI-native B2B, devtools, and regulated enterprise buyers.',
    },
    hero: {
      headline: 'Services built for skeptical B2B buyers',
      subheadline:
        'Positioning sprints, demand programs, RevOps instrumentation, and executive narratives — scoped for AI-native products, developer tools, and regulated enterprise paths.',
    },
    primaryCta: { label: 'Talk to us', href: '/contact' },
    layout: [
      {
        blockType: 'stats',
        variant: 'compact',
        items: [
          { value: 'GTM', label: 'ICP & AI product narrative' },
          { value: 'Demand', label: 'Paid + organic programs' },
          { value: 'RevOps', label: 'Eval-cycle attribution' },
          { value: 'Exec', label: 'Board & keynote arcs' },
        ],
      },
      {
        blockType: 'faq',
        items: [
          {
            question: 'How do we tailor scope to our GTM stage?',
            answer:
              'We start with your ICP, claims, and proof gaps, then sequence narrative, demand, and RevOps work. Edit any page in /console → Pages as your story evolves.',
          },
          {
            question: 'How do I change the booking flow?',
            answer:
              'Update /console → Booking profiles and link routes like /book/strategy-call to your profile slug or id.',
          },
        ],
      },
      {
        blockType: 'cta',
        label: 'Book a strategy call',
        href: '/book/strategy-call',
        variant: 'primary',
      },
    ],
    defaultFormConfig: formFull,
  }

  const bookCallDoc: Partial<Page> = {
    navigationLabel: 'Book a call',
    navigationHref: '/book/strategy-call',
    navOrder: 15,
    seo: {
      title: 'Book a strategy call',
      description: 'Schedule time with the TMA team.',
    },
    hero: {
      headline: 'Book a strategy call',
      subheadline:
        'Pick a time to walk through positioning, demand, or RevOps — same flow as the booking widget elsewhere on the site. Adjust copy anytime in /console → Pages.',
    },
    primaryCta: { label: 'Open calendar', href: '/book/strategy-call' },
    layout: [
      {
        blockType: 'cta',
        label: 'Pick a time',
        href: '/book/strategy-call',
        variant: 'primary',
      },
    ],
  }

  const contactDoc: Partial<Page> = {
    navigationLabel: 'Contact',
    navOrder: 30,
    seo: {
      title: 'Contact TMA',
      description:
        'Reach out about AI product positioning, demand, or GTM — we respond within one business day.',
    },
    hero: {
      headline: 'Contact us',
      subheadline:
        'Tell us about your product, ICP, and timeline. Fields, routing, and notifications are configured in /console → Forms.',
    },
    primaryCta: { label: 'Email hello@tma.example', href: 'mailto:hello@tma.example' },
    layout: [{ blockType: 'form', formConfig: formFull }],
    defaultFormConfig: formFull,
  }

  const thanksDoc: Partial<Page> = {
    seo: { title: 'Thank you', description: 'We received your submission.' },
    hero: {
      headline: 'Thanks — you are all set',
      subheadline:
        'We will follow up shortly. You can return home, explore services, or book time if you prefer to talk live.',
    },
    layout: [
      { blockType: 'cta', label: 'Back to home', href: '/', variant: 'ghost' },
      {
        blockType: 'cta',
        label: 'Explore services',
        href: '/services',
        variant: 'secondary',
      },
    ],
  }

  return { homeDoc, servicesDoc, bookCallDoc, contactDoc, thanksDoc }
}

async function insertMissingDemoPages(
  db: CustomDb,
  docs: {
    homeDoc: Partial<Page>
    servicesDoc: Partial<Page>
    bookCallDoc: Partial<Page>
    contactDoc: Partial<Page>
    thanksDoc: Partial<Page>
  },
): Promise<void> {
  const rows: Array<{
    slug: string
    pageType: string
    status: string
    title: string
    document: Partial<Page>
  }> = [
    { slug: 'home', pageType: 'home', status: 'published', title: 'Home', document: docs.homeDoc },
    {
      slug: 'services',
      pageType: 'services',
      status: 'published',
      title: 'Services',
      document: docs.servicesDoc,
    },
    {
      slug: 'book-call',
      pageType: 'landing',
      status: 'published',
      title: 'Book a call',
      document: docs.bookCallDoc,
    },
    {
      slug: 'contact',
      pageType: 'contact',
      status: 'published',
      title: 'Contact',
      document: docs.contactDoc,
    },
    { slug: 'thanks', pageType: 'other', status: 'published', title: 'Thanks', document: docs.thanksDoc },
  ]

  for (const p of rows) {
    const existing = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, p.slug))
      .limit(1)
    if (existing[0]) continue
    await db.insert(cmsPages).values({
      slug: p.slug,
      pageType: p.pageType,
      status: p.status,
      title: p.title,
      document: p.document,
    })
  }
}

async function insertMissingDemoProduct(db: CustomDb): Promise<void> {
  const existing = await db
    .select({ id: cmsProducts.id })
    .from(cmsProducts)
    .where(eq(cmsProducts.slug, 'ai-positioning-sprint'))
    .limit(1)
  if (existing[0]) return

  await db.insert(cmsProducts).values({
    slug: 'ai-positioning-sprint',
    name: 'AI positioning sprint',
    status: 'published',
    document: {
      tagline: 'Two weeks from fuzzy claims to buyer-tested narrative',
      modules: [
        {
          title: 'ICP & buying jobs',
          body: 'Who signs, who blocks, and what proof each stakeholder needs.',
        },
        {
          title: 'Claims map',
          body: 'Verifiable statements aligned to security, ROI, and evaluation.',
        },
      ],
      primaryCta: { label: 'Book a strategy call', href: '/book/strategy-call' },
    },
  })
}

async function ensureDemoBrandMedia(db: CustomDb): Promise<void> {
  try {
    await db
      .insert(cmsMedia)
      .values([
        {
          storageKey: 'brand/tma-logo-white.png',
          filename: 'tma-logo-white.png',
          alt: 'TMA wordmark — white',
          mimeType: 'image/png',
          byteSize: null,
        },
        {
          storageKey: 'brand/tma-logo-black.png',
          filename: 'tma-logo-black.png',
          alt: 'TMA wordmark — black',
          mimeType: 'image/png',
          byteSize: null,
        },
      ])
      .onConflictDoNothing({ target: cmsMedia.storageKey })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('does not exist') || msg.includes('42P01')) {
      console.warn(
        'cms_media table missing; skipped demo media rows. Run `npm run db:custom:migrate`, then `npm run seed` again.',
      )
      return
    }
    throw e
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

  const homeRow = await db
    .select({ id: cmsPages.id })
    .from(cmsPages)
    .where(eq(cmsPages.slug, 'home'))
    .limit(1)

  const marker = await db
    .select({ id: cmsEmailTemplates.id })
    .from(cmsEmailTemplates)
    .where(eq(cmsEmailTemplates.slug, 'lead-thanks'))
    .limit(1)

  if (!force && homeRow.length > 0) {
    console.info(
      'CMS demo seed skipped: starter `home` page exists. Use `npm run seed -- --force` to replace demo rows.',
    )
    return
  }

  if (force && marker.length > 0) {
    await deleteDemoArtifacts(db)
  }

  const { thanksId, bookingId } = await ensureEmailTemplates(db)
  const formRow = await ensureContactForm(db, thanksId)
  const bookingRow = await ensureBookingProfile(db, bookingId)
  const formFull = toFormFull(formRow)
  const bookingFull = toBookingFull(bookingRow)

  const docs = buildDemoPageDocuments(formFull, bookingFull)
  await insertMissingDemoPages(db, docs)
  await insertMissingDemoProduct(db)
  await ensureDemoBrandMedia(db)

  if (!force && marker.length > 0 && homeRow.length === 0) {
    console.info('CMS demo: backfilled missing starter pages (templates were already present).')
  }

  const origin = (
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4069'
  ).replace(/\/$/, '')
  console.info(
    `CMS demo seeded. Open ${origin}/, ${origin}/book/strategy-call, ${origin}/api/products`,
  )
}
