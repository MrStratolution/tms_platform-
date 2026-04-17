import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

/** App-owned PostgreSQL schema (no third-party CMS tables). */
export const tmaCustom = pgSchema('tma_custom')

export const migrationCheckpoint = tmaCustom.table('migration_checkpoint', {
  id: serial('id').primaryKey(),
  phase: text('phase').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Custom admin panel (`/console`). */
export const adminUsers = tmaCustom.table('admin_user', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  whatsappNumber: text('whatsapp_number'),
  role: text('role').notNull().default('admin'),
  uiLocale: text('ui_locale').notNull().default('de'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Published / draft marketing pages (full document JSON for public render). */
export const cmsPages = tmaCustom.table('cms_page', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  pageType: text('page_type').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  document: jsonb('document').notNull(),
  lastEditedByUserId: uuid('last_edited_by_user_id'),
  lastEditedByEmail: text('last_edited_by_email'),
  /**
   * Set to `true` by the demo seed. Lets the console page list show a "Demo"
   * badge and lets ops bulk-delete demo pages before going live.
   */
  isDemoContent: boolean('is_demo_content').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsFormConfigs = tmaCustom.table('cms_form_config', {
  id: serial('id').primaryKey(),
  formType: text('form_type').notNull().unique(),
  active: boolean('active').notNull().default(true),
  document: jsonb('document').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsBookingProfiles = tmaCustom.table('cms_booking_profile', {
  id: serial('id').primaryKey(),
  internalSlug: text('internal_slug').unique(),
  active: boolean('active').notNull().default(true),
  document: jsonb('document').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsSmtpSettings = tmaCustom.table('smtp_settings', {
  id: serial('id').primaryKey(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  secure: boolean('secure').notNull().default(false),
  username: text('username').notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  fromName: text('from_name').notNull(),
  fromEmail: text('from_email').notNull(),
  replyTo: text('reply_to'),
  active: boolean('active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsEmailTemplates = tmaCustom.table(
  'email_templates',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    language: text('language').notNull().default('de'),
    subject: text('subject').notNull(),
    htmlBody: text('html_body').notNull(),
    variablesJson: jsonb('variables_json').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keyLanguageUnique: unique('email_templates_key_language_unique').on(
      table.key,
      table.language,
    ),
  }),
)

export const cmsServices = tmaCustom.table('cms_service', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary'),
  promise: text('promise'),
  proof: jsonb('proof'),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsIndustries = tmaCustom.table('cms_industry', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary'),
  messaging: jsonb('messaging'),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsLeads = tmaCustom.table('cms_lead', {
  id: serial('id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  website: text('website'),
  serviceInterestId: integer('service_interest_id'),
  industryId: integer('industry_id'),
  sourcePageId: integer('source_page_id'),
  sourcePageSlug: text('source_page_slug'),
  utm: jsonb('utm'),
  formType: text('form_type'),
  bookingStatus: text('booking_status').notNull().default('none'),
  owner: text('owner'),
  leadStatus: text('lead_status').notNull().default('new'),
  crmSyncStatus: text('crm_sync_status').notNull().default('pending'),
  notes: text('notes'),
  consentMarketing: boolean('consent_marketing').notNull().default(false),
  idempotencyKey: text('idempotency_key').unique(),
  submissionExtras: jsonb('submission_extras'),
  /**
   * Set to `true` by the demo seed script so ops can filter demo rows from
   * production dashboards with `WHERE is_demo_content = false`.
   * Never set to `true` by real form submissions.
   */
  isDemoContent: boolean('is_demo_content').notNull().default(false),
  /**
   * Admin user UUID assigned to own this lead (maps to admin_user.id).
   * Null = unassigned. Set by ops in the lead dashboard.
   */
  assignedToUserId: uuid('assigned_to_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsBookingEvents = tmaCustom.table('cms_booking_event', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id'),
  bookingProfileId: integer('booking_profile_id'),
  providerEventId: text('provider_event_id'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  status: text('status').notNull().default('pending'),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsCrmSyncLogs = tmaCustom.table('cms_crm_sync_log', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').notNull(),
  targetSystem: text('target_system').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload').notNull(),
  response: jsonb('response').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsEmailLogs = tmaCustom.table('email_logs', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id'),
  templateId: integer('template_id'),
  templateKey: text('template_key').notNull(),
  recipient: text('recipient').notNull(),
  language: text('language').notNull().default('de'),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  payloadJson: jsonb('payload_json'),
  providerMessageId: text('provider_message_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsTrackingEvents = tmaCustom.table('cms_tracking_event', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  properties: jsonb('properties'),
  leadId: integer('lead_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsAbVariants = tmaCustom.table('cms_ab_variant', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull(),
  label: text('label').notNull(),
  experimentSlug: text('experiment_slug'),
  variantKey: text('variant_key').notNull(),
  weight: integer('weight'),
  active: boolean('active').notNull().default(true),
  heroHeadline: text('hero_headline'),
  heroSubheadline: text('hero_subheadline'),
  primaryCtaLabel: text('primary_cta_label'),
  primaryCtaHref: text('primary_cta_href'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsPageLocalizations = tmaCustom.table('cms_page_localization', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull(),
  locale: text('locale').notNull(),
  sourceLocale: text('source_locale'),
  /** idle | queued | running | ready | failed */
  jobStatus: text('job_status'),
  lastError: text('last_error'),
  /**
   * Total translatable blocks on the source page when the job last ran.
   * Used by the console to render a progress bar.
   */
  blocksTotal: integer('blocks_total'),
  /**
   * Blocks successfully translated so far. Progress % = blocksTranslated / blocksTotal.
   */
  blocksTranslated: integer('blocks_translated'),
  /**
   * Timestamp of the last completed (or failed) translation job run.
   */
  lastJobCompletedAt: timestamp('last_job_completed_at', { withTimezone: true }),
  heroHeadline: text('hero_headline'),
  heroSubheadline: text('hero_subheadline'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  /** Translated `document.layout` JSON when job completes (same shape as source). */
  layoutJson: jsonb('layout_json'),
  layoutNotes: text('layout_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Product / offer content (strategy §7) — JSON document for modules, FAQs, CTAs, etc. */
export const cmsProducts = tmaCustom.table('cms_product', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  contentKind: text('content_kind').notNull().default('product'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  listingPriority: integer('listing_priority'),
  showInProjectFeeds: boolean('show_in_project_feeds').notNull().default(false),
  document: jsonb('document').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Uploaded files served from `/uploads/cms/...` (public disk). */
export const cmsMedia = tmaCustom.table('cms_media', {
  id: serial('id').primaryKey(),
  storageKey: text('storage_key').notNull().unique(),
  filename: text('filename').notNull(),
  alt: text('alt'),
  mimeType: text('mime_type'),
  byteSize: integer('byte_size'),
  /** Optional folder/category for organizing media in the console library. */
  folder: text('folder'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Singleton SEO / tracking defaults for the public site (one row).
 * Editable under `/console/settings`. Document shape: `SiteSettingsDocument` in `src/lib/siteSettings.ts`.
 */
export const cmsSiteSettings = tmaCustom.table('cms_site_settings', {
  id: serial('id').primaryKey(),
  document: jsonb('document').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Reusable testimonial quotes (referenced by id from `testimonialSlider` layout blocks). */
export const cmsTestimonials = tmaCustom.table('cms_testimonial', {
  id: serial('id').primaryKey(),
  quote: text('quote').notNull(),
  author: text('author').notNull(),
  role: text('role'),
  company: text('company'),
  photoMediaId: integer('photo_media_id'),
  logoMediaId: integer('logo_media_id'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Reusable FAQ Q&A (referenced by `faqEntryIds` on FAQ layout blocks). */
export const cmsFaqEntries = tmaCustom.table('cms_faq_entry', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Reusable download / resource metadata (referenced by `downloadAssetId` on download blocks). */
export const cmsDownloadAssets = tmaCustom.table('cms_download_asset', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  fileLabel: text('file_label'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** CMS team member profiles (referenced by `teamGrid` layout blocks). */
export const cmsTeamMembers = tmaCustom.table('cms_team_member', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  bio: text('bio'),
  photoMediaId: integer('photo_media_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  linkedinUrl: text('linkedin_url'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** CMS case study entries (referenced by `caseStudyGrid` layout blocks). */
export const cmsCaseStudies = tmaCustom.table('cms_case_study', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary'),
  industryId: integer('industry_id'),
  featuredImageId: integer('featured_image_id'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Saved single layout blocks for reuse on pages (`block` = one layout item JSON). */
export const cmsLayoutBlocks = tmaCustom.table('cms_layout_block', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  block: jsonb('block').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsPageRevisions = tmaCustom.table('cms_page_revision', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  pageType: text('page_type').notNull(),
  status: text('status').notNull(),
  document: jsonb('document').notNull(),
  reason: text('reason'),
  actorUserId: uuid('actor_user_id'),
  actorEmail: text('actor_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cmsAuditLogs = tmaCustom.table('cms_audit_log', {
  id: serial('id').primaryKey(),
  actorUserId: uuid('actor_user_id'),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
