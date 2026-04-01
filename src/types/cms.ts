/* tslint:disable */
/* eslint-disable */
/**
 * CMS document and config types for `Page`, blocks, and related entities.
 * Public content is read from `tma_custom` via Drizzle; these shapes power TypeScript and APIs.
 */

/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    users: User;
    media: Media;
    services: Service;
    industries: Industry;
    testimonials: Testimonial;
    'team-members': TeamMember;
    'case-studies': CaseStudy;
    'email-templates': EmailTemplate;
    'form-configs': FormConfig;
    'booking-profiles': BookingProfile;
    pages: Page;
    'ab-variants': AbVariant;
    'page-localizations': PageLocalization;
    leads: Lead;
    'booking-events': BookingEvent;
    'crm-sync-logs': CrmSyncLog;
    'email-logs': EmailLog;
    'tracking-events': TrackingEvent;
    'cms-system-kv': CmsLegacyKv;
    'cms-system-locked-documents': CmsLegacyLockedDocument;
    'cms-system-preferences': CmsLegacyPreference;
    'cms-system-migrations': CmsLegacyMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    users: UsersSelect<false> | UsersSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    services: ServicesSelect<false> | ServicesSelect<true>;
    industries: IndustriesSelect<false> | IndustriesSelect<true>;
    testimonials: TestimonialsSelect<false> | TestimonialsSelect<true>;
    'team-members': TeamMembersSelect<false> | TeamMembersSelect<true>;
    'case-studies': CaseStudiesSelect<false> | CaseStudiesSelect<true>;
    'email-templates': EmailTemplatesSelect<false> | EmailTemplatesSelect<true>;
    'form-configs': FormConfigsSelect<false> | FormConfigsSelect<true>;
    'booking-profiles': BookingProfilesSelect<false> | BookingProfilesSelect<true>;
    pages: PagesSelect<false> | PagesSelect<true>;
    'ab-variants': AbVariantsSelect<false> | AbVariantsSelect<true>;
    'page-localizations': PageLocalizationsSelect<false> | PageLocalizationsSelect<true>;
    leads: LeadsSelect<false> | LeadsSelect<true>;
    'booking-events': BookingEventsSelect<false> | BookingEventsSelect<true>;
    'crm-sync-logs': CrmSyncLogsSelect<false> | CrmSyncLogsSelect<true>;
    'email-logs': EmailLogsSelect<false> | EmailLogsSelect<true>;
    'tracking-events': TrackingEventsSelect<false> | TrackingEventsSelect<true>;
    'cms-system-kv': CmsLegacyKvSelect<false> | CmsLegacyKvSelect<true>;
    'cms-system-locked-documents': CmsLegacyLockedDocumentsSelect<false> | CmsLegacyLockedDocumentsSelect<true>;
    'cms-system-preferences': CmsLegacyPreferencesSelect<false> | CmsLegacyPreferencesSelect<true>;
    'cms-system-migrations': CmsLegacyMigrationsSelect<false> | CmsLegacyMigrationsSelect<true>;
  };
  db: {
    defaultIDType: number;
  };
  fallbackLocale: null;
  globals: {};
  globalsSelect: {};
  locale: null;
  widgets: {
    collections: CollectionsWidget;
  };
  user: User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: number;
  role: 'admin' | 'ops' | 'editor';
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'users';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: number;
  alt: string;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "services".
 */
export interface Service {
  id: number;
  name: string;
  slug: string;
  summary?: string | null;
  promise?: string | null;
  proof?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "industries".
 */
export interface Industry {
  id: number;
  name: string;
  slug: string;
  summary?: string | null;
  messaging?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "testimonials".
 */
export interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role?: string | null;
  company?: string | null;
  photo?: (number | null) | Media;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "team-members".
 */
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio?: string | null;
  photo?: (number | null) | Media;
  /**
   * Lower numbers appear first in the team grid.
   */
  sortOrder?: number | null;
  linkedinUrl?: string | null;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "case-studies".
 */
export interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  industry?: (number | null) | Industry;
  featuredImage?: (number | null) | Media;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "email-templates".
 */
export interface EmailTemplate {
  id: number;
  name: string;
  slug: string;
  subject: string;
  body: string;
  preheader?: string | null;
  useCase?:
    | 'generic'
    | 'lead_thank_you'
    | 'booking_confirmation'
    | 'booking_reminder'
    | 'internal_lead_notification'
    | 'internal_sync_alert'
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "form-configs".
 */
export interface FormConfig {
  id: number;
  name: string;
  formType: string;
  intro?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  fields?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  destination?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  autoresponderTemplate?: (number | null) | EmailTemplate;
  spamProtection?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  consent?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  layout?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Custom (built-in) is the default on-site scheduler. Calendly and Microsoft Bookings are optional external links.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "booking-profiles".
 */
export interface BookingProfile {
  id: number;
  name: string;
  provider: 'internal' | 'calendly' | 'ms_bookings' | 'other';
  /**
   * Used in /book/your-slug. Letters, numbers, hyphens only. Leave empty to use numeric id in URLs.
   */
  internalSlug?: string | null;
  /**
   * Length of each appointment (custom scheduler).
   */
  durationMinutes?: number | null;
  /**
   * Optional. Example: { "windows": [{ "weekday": 1, "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0 }], "slotStepMinutes": 30 }. Weekday 0=Sun … 6=Sat. Defaults to Mon–Fri 09:00–17:00 server local time.
   */
  availability?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  /**
   * Required for Calendly, Microsoft Bookings, or Other. Ignored for Custom (built-in).
   */
  bookingUrl?: string | null;
  assignedOwner?: string | null;
  thankYouPageSlug?: string | null;
  ctaLabel?: string | null;
  helperText?: string | null;
  layout?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  /**
   * Sent via Resend when a visitor confirms a **custom (built-in)** booking. Use {{firstName}}, {{scheduledFor}}, {{bookingProfileName}}, {{durationMinutes}}, {{slotEnd}} in subject/body.
   */
  confirmationEmailTemplate?: (number | null) | EmailTemplate;
  tracking?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  active?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/** Optional chrome on any layout block (stored as extra keys on layout JSON). */
export interface LayoutBlockChromeFields {
  anchorId?: string | null
  sectionSpacingY?: 'inherit' | 'none' | 'sm' | 'md' | 'lg' | null
  widthMode?: 'inherit' | 'default' | 'narrow' | 'full' | null
  customClass?: string | null
  sectionHidden?: boolean | null
  /** Responsive visibility: hide on specific device classes. */
  hideOnDesktop?: boolean | null
  hideOnMobile?: boolean | null
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "pages".
 */
export interface Page {
  id: number;
  title: string;
  slug: string;
  pageType:
    | 'home'
    | 'services'
    | 'landing'
    | 'resource'
    | 'contact'
    | 'other'
    | 'product'
    | 'industry'
    | 'thank_you'
    | 'blank';
  status: 'draft' | 'review' | 'published' | 'archived' | 'trashed';
  seo?: {
    title?: string | null;
    description?: string | null;
    ogImage?: (number | null) | Media;
    /** Absolute or site-relative URL string for Open Graph (takes precedence over `ogImage` when set). */
    ogImageUrl?: string | null;
    /** Override default canonical URL for this page. */
    canonicalUrl?: string | null;
  };
  hero?: {
    headline?: string | null;
    subheadline?: string | null;
    backgroundMedia?: (number | null) | Media;
  };
  primaryCta?: {
    label?: string | null;
    href?: string | null;
  };
  /** Optional label for primary navigation when the header reads from page data. */
  navigationLabel?: string | null;
  /** Optional nav URL (path or absolute). Defaults to `/{slug}` when unset. */
  navigationHref?: string | null;
  /** Sort order in header (lower first). Missing values sort last. */
  navOrder?: number | null;
  /**
   * How many main layout blocks (excluding sticky CTA) render before the page-level hero.
   * `0` or unset = hero first (default). `1` = first block, then hero, then the rest.
   */
  heroInsertIndex?: number | null;
  /** Page-level presentation overrides (inherit = use global defaults only). */
  pageTheme?: ('inherit' | 'default' | 'dark' | 'light') | null
  maxWidthMode?: ('inherit' | 'default' | 'narrow' | 'full') | null
  sectionSpacingPreset?: ('inherit' | 'compact' | 'default' | 'comfortable' | 'spacious') | null
  headerVariant?: ('inherit' | 'default' | 'minimal') | null
  footerVariant?: ('inherit' | 'default' | 'minimal') | null
  /** Advanced: scoped CSS for this page only (console: ops/admin). */
  customCss?: string | null
  /** Page-level tracking overrides (merge with global GTM, or add per-page pixel IDs). */
  trackingOverrides?: {
    /** Override or supplement global GTM container for this page. */
    gtmContainerId?: string | null
    /** Meta / Facebook Pixel ID for this page only. */
    metaPixelId?: string | null
    /** LinkedIn Insight tag partner ID for this page only. */
    linkedInPartnerId?: string | null
  } | null
  layout?:
    | (
        (
        | {
            headline: string;
            subheadline?: string | null;
            backgroundMedia?: (number | null) | Media;
            backgroundMediaUrl?: string | null;
            ctaLabel?: string | null;
            ctaHref?: string | null;
            height?: ('short' | 'medium' | 'tall') | null;
            mediaFit?: ('cover' | 'contain') | null;
            mediaPositionX?: ('left' | 'center' | 'right') | null;
            mediaPositionY?: ('top' | 'center' | 'bottom') | null;
            tabletImageUrl?: string | null;
            mobileImageUrl?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'hero';
          }
        | {
            label: string;
            href: string;
            variant?: ('primary' | 'secondary' | 'ghost') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'cta';
          }
        | {
            /** Small label above the headline (e.g. “New”, “Limited”). */
            eyebrow?: string | null;
            headline: string;
            body?: string | null;
            ctaLabel?: string | null;
            ctaHref?: string | null;
            /** Visual treatment for the band */
            variant?: ('lime' | 'dark' | 'outline' | 'gradient') | null;
            align?: ('left' | 'center') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'promoBanner';
          }
        | {
            headline?: string | null;
            subheadline?: string | null;
            imageUrl: string;
            imageAlt?: string | null;
            ctaLabel?: string | null;
            ctaHref?: string | null;
            overlay?: ('strong' | 'medium' | 'light') | null;
            height?: ('short' | 'medium' | 'tall') | null;
            mediaWidth?: ('narrow' | 'default' | 'wide' | 'full') | null;
            aspectRatio?: ('auto' | 'square' | 'portrait' | 'landscape' | 'cinema') | null;
            mediaFit?: ('cover' | 'contain') | null;
            mediaAlign?: ('left' | 'center' | 'right') | null;
            borderRadius?: ('none' | 'sm' | 'md' | 'lg' | 'pill') | null;
            mediaPositionX?: ('left' | 'center' | 'right') | null;
            mediaPositionY?: ('top' | 'center' | 'bottom') | null;
            maxMediaWidth?: string | null;
            maxMediaHeight?: string | null;
            tabletImageUrl?: string | null;
            mobileImageUrl?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'imageBanner';
          }
        | {
            sectionTitle?: string | null;
            intro?: string | null;
            items?:
              | {
                  icon?: string | null;
                  title: string;
                  body?: string | null;
                  id?: string | null;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'iconRow';
          }
        | {
            quote: string;
            attribution?: string | null;
            roleLine?: string | null;
            variant?: ('lime' | 'muted' | 'border') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'quoteBand';
          }
        | {
            logos?: (number | Media)[] | null;
            /** Default: start-aligned; center groups logos in the row */
            logoAlign?: ('start' | 'center') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'proofBar';
          }
        | {
            testimonials?: (number | Testimonial)[] | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'testimonialSlider';
          }
        | {
            formConfig: number | FormConfig;
            width?: ('narrow' | 'default' | 'wide' | 'full') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'form';
          }
        | {
            bookingProfile: number | BookingProfile;
            width?: ('narrow' | 'default' | 'wide' | 'full') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'booking';
          }
        | {
            items?:
              | {
                  question: string;
                  answer: string;
                  id?: string | null;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'faq';
          }
        | {
            content?: {
              root: {
                type: string;
                children: {
                  type: any;
                  version: number;
                  [k: string]: unknown;
                }[];
                direction: ('ltr' | 'rtl') | null;
                format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
                indent: number;
                version: number;
              };
              [k: string]: unknown;
            } | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'rich';
          }
        | {
            items?:
              | {
                  value: string;
                  suffix?: string | null;
                  label: string;
                  id?: string | null;
                }[]
              | null;
            variant?: ('default' | 'compact') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'stats';
          }
        | {
            sectionTitle?: string | null;
            intro?: string | null;
            members: (number | TeamMember)[];
            id?: string | null;
            blockName?: string | null;
            blockType: 'teamGrid';
          }
        | {
            sectionTitle?: string | null;
            studies: (number | CaseStudy)[];
            id?: string | null;
            blockName?: string | null;
            blockType: 'caseStudyGrid';
          }
        | {
            sectionTitle?: string | null;
            intro?: string | null;
            plans?:
              | {
                  name: string;
                  price: string;
                  cadence?: ('monthly' | 'annual' | 'once' | 'custom') | null;
                  highlighted?: boolean | null;
                  description?: string | null;
                  bullets?:
                    | {
                        text: string;
                        id?: string | null;
                      }[]
                    | null;
                  ctaLabel?: string | null;
                  ctaHref?: string | null;
                  id?: string | null;
                }[]
              | null;
            footnote?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'pricing';
          }
        | {
            sectionTitle?: string | null;
            intro?: string | null;
            columns?:
              | {
                  heading: string;
                  id?: string | null;
                }[]
              | null;
            rows?:
              | {
                  label: string;
                  cells?:
                    | {
                        value?: string | null;
                        id?: string | null;
                      }[]
                    | null;
                  id?: string | null;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'comparison';
          }
        | {
            sectionTitle?: string | null;
            intro?: string | null;
            steps?:
              | {
                  badge?: string | null;
                  title: string;
                  body?: string | null;
                  id?: string | null;
                }[]
              | null;
            variant?: ('default' | 'compact') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'process';
          }
        | {
            headline?: string | null;
            body?: string | null;
            imageUrl?: string | null;
            imageAlt?: string | null;
            imagePosition?: ('left' | 'right' | 'top' | 'bottom') | null;
            mediaWidth?: ('narrow' | 'default' | 'wide' | 'full') | null;
            aspectRatio?: ('auto' | 'square' | 'portrait' | 'landscape' | 'cinema') | null;
            mediaFit?: ('cover' | 'contain') | null;
            mediaAlign?: ('left' | 'center' | 'right') | null;
            borderRadius?: ('none' | 'sm' | 'md' | 'lg' | 'pill') | null;
            mediaPositionX?: ('left' | 'center' | 'right') | null;
            mediaPositionY?: ('top' | 'center' | 'bottom') | null;
            maxMediaWidth?: string | null;
            maxMediaHeight?: string | null;
            tabletImageUrl?: string | null;
            mobileImageUrl?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'textMedia';
          }
        | {
            title?: string | null;
            url: string;
            sourceType?: ('embed' | 'upload') | null;
            uploadedVideoUrl?: string | null;
            posterUrl?: string | null;
            /** full = edge-to-edge in content column; narrow = capped width, centered */
            width?: ('narrow' | 'default' | 'wide' | 'full') | null;
            height?: ('auto' | 'short' | 'medium' | 'tall') | null;
            aspectRatio?: ('auto' | 'square' | 'portrait' | 'landscape' | 'cinema') | null;
            mediaAlign?: ('left' | 'center' | 'right') | null;
            borderRadius?: ('none' | 'sm' | 'md' | 'lg' | 'pill') | null;
            maxMediaWidth?: string | null;
            maxMediaHeight?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'video';
          }
        | {
            title: string;
            description?: string | null;
            fileUrl: string;
            fileLabel?: string | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'download';
          }
        | {
            label: string;
            href: string;
            variant?: ('primary' | 'secondary' | 'ghost') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'stickyCta';
          }
        | {
            /** Row id in `cms_layout_blocks`; hydrated to the saved block JSON for public render. */
            layoutBlockId: number;
            id?: string | null;
            blockName?: string | null;
            blockType: 'layoutBlockRef';
          }
        | {
            /** Height token: xs | sm | md | lg | xl */
            height?: ('xs' | 'sm' | 'md' | 'lg' | 'xl') | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'spacer';
          }
        ) &
          LayoutBlockChromeFields
      )[]
    | null;
  defaultFormConfig?: (number | null) | FormConfig;
  defaultBookingProfile?: (number | null) | BookingProfile;
  tracking?: {
    offer?: string | null;
    industry?: string | null;
  };
  /**
   * On publish, queue AI translation jobs into Page localizations. Process with POST /api/integrations/ai/run-localization-jobs (cron) or the admin AI panel.
   */
  localizationAutomation?: {
    autoQueueOnPublish?: boolean | null;
    /**
     * Language the current page is written in.
     */
    sourceLocale?: string | null;
    /**
     * Locales to translate hero + SEO into.
     */
    targetLocales?: ('de' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'ja' | 'zh' | 'ar' | 'hi' | 'en-GB')[] | null;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * Each row is one arm (A or B). Empty overlay fields fall back to the main page. Weight is used when assigning buckets (see README).
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "ab-variants".
 */
export interface AbVariant {
  id: number;
  /**
   * Internal name, e.g. "Home hero Q2 test".
   */
  label: string;
  page: number | Page;
  /**
   * Groups arms; cookie suffix. Use "default" for a single experiment per page.
   */
  experimentSlug?: string | null;
  variantKey: 'a' | 'b';
  /**
   * Relative traffic share for automatic bucket assignment (POST /api/ab/assign). Ignored if sum is 0.
   */
  weight?: number | null;
  active?: boolean | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaHref?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Translated hero + SEO per page. Queue jobs from the page document or POST /api/integrations/ai/run-localization-jobs.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "page-localizations".
 */
export interface PageLocalization {
  id: number;
  page: number | Page;
  locale: 'de' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'ja' | 'zh' | 'ar' | 'hi' | 'en-GB';
  /**
   * Base language on the page when the job runs.
   */
  sourceLocale?: string | null;
  jobStatus?: ('idle' | 'queued' | 'running' | 'ready' | 'failed') | null;
  lastError?: string | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /**
   * Optional: paste localized block copy or instructions for editors (not rendered automatically on the public site).
   */
  layoutNotes?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Unified lead intake (Postgres source of truth). Editors cannot access leads.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "leads".
 */
export interface Lead {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  serviceInterest?: (number | null) | Service;
  industry?: (number | null) | Industry;
  sourcePage?: (number | null) | Page;
  sourcePageSlug?: string | null;
  utm?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  formType?: string | null;
  bookingStatus?: ('none' | 'started' | 'scheduled' | 'cancelled') | null;
  owner?: string | null;
  leadStatus?: ('new' | 'contacted' | 'qualified' | 'lost' | 'won') | null;
  crmSyncStatus?: ('pending' | 'synced' | 'failed' | 'skipped') | null;
  notes?: string | null;
  consentMarketing?: boolean | null;
  idempotencyKey?: string | null;
  /**
   * Key/value pairs not mapped to core lead columns.
   */
  submissionExtras?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "booking-events".
 */
export interface BookingEvent {
  id: number;
  lead?: (number | null) | Lead;
  bookingProfile?: (number | null) | BookingProfile;
  providerEventId?: string | null;
  scheduledFor?: string | null;
  status?: ('pending' | 'confirmed' | 'cancelled') | null;
  rawPayload?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "crm-sync-logs".
 */
export interface CrmSyncLog {
  id: number;
  lead: number | Lead;
  targetSystem: string;
  status: 'success' | 'failed' | 'skipped';
  payload?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  response?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  syncedAt: string;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "email-logs".
 */
export interface EmailLog {
  id: number;
  lead?: (number | null) | Lead;
  template?: (number | null) | EmailTemplate;
  recipient: string;
  status: 'queued' | 'sent' | 'failed';
  providerMessageId?: string | null;
  sentAt?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * Client-side analytics events (offer, CTA, campaign context).
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "tracking-events".
 */
export interface TrackingEvent {
  id: number;
  eventType: string;
  path?: string | null;
  metadata?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  visitorKey?: string | null;
  updatedAt: string;
  createdAt: string;
}
/** Legacy `Config` collection shape — not mapped to Drizzle in this app. */
export interface CmsLegacyKv {
  id: number;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}
/** Legacy `Config` collection shape — not mapped to Drizzle in this app. */
export interface CmsLegacyLockedDocument {
  id: number;
  document?:
    | ({
        relationTo: 'users';
        value: number | User;
      } | null)
    | ({
        relationTo: 'media';
        value: number | Media;
      } | null)
    | ({
        relationTo: 'services';
        value: number | Service;
      } | null)
    | ({
        relationTo: 'industries';
        value: number | Industry;
      } | null)
    | ({
        relationTo: 'testimonials';
        value: number | Testimonial;
      } | null)
    | ({
        relationTo: 'team-members';
        value: number | TeamMember;
      } | null)
    | ({
        relationTo: 'case-studies';
        value: number | CaseStudy;
      } | null)
    | ({
        relationTo: 'email-templates';
        value: number | EmailTemplate;
      } | null)
    | ({
        relationTo: 'form-configs';
        value: number | FormConfig;
      } | null)
    | ({
        relationTo: 'booking-profiles';
        value: number | BookingProfile;
      } | null)
    | ({
        relationTo: 'pages';
        value: number | Page;
      } | null)
    | ({
        relationTo: 'ab-variants';
        value: number | AbVariant;
      } | null)
    | ({
        relationTo: 'page-localizations';
        value: number | PageLocalization;
      } | null)
    | ({
        relationTo: 'leads';
        value: number | Lead;
      } | null)
    | ({
        relationTo: 'booking-events';
        value: number | BookingEvent;
      } | null)
    | ({
        relationTo: 'crm-sync-logs';
        value: number | CrmSyncLog;
      } | null)
    | ({
        relationTo: 'email-logs';
        value: number | EmailLog;
      } | null)
    | ({
        relationTo: 'tracking-events';
        value: number | TrackingEvent;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  updatedAt: string;
  createdAt: string;
}
/** Legacy `Config` collection shape — not mapped to Drizzle in this app. */
export interface CmsLegacyPreference {
  id: number;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/** Legacy `Config` collection shape — not mapped to Drizzle in this app. */
export interface CmsLegacyMigration {
  id: number;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users_select".
 */
export interface UsersSelect<T extends boolean = true> {
  role?: T;
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media_select".
 */
export interface MediaSelect<T extends boolean = true> {
  alt?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "services_select".
 */
export interface ServicesSelect<T extends boolean = true> {
  name?: T;
  slug?: T;
  summary?: T;
  promise?: T;
  proof?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "industries_select".
 */
export interface IndustriesSelect<T extends boolean = true> {
  name?: T;
  slug?: T;
  summary?: T;
  messaging?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "testimonials_select".
 */
export interface TestimonialsSelect<T extends boolean = true> {
  quote?: T;
  author?: T;
  role?: T;
  company?: T;
  photo?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "team-members_select".
 */
export interface TeamMembersSelect<T extends boolean = true> {
  name?: T;
  role?: T;
  bio?: T;
  photo?: T;
  sortOrder?: T;
  linkedinUrl?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "case-studies_select".
 */
export interface CaseStudiesSelect<T extends boolean = true> {
  title?: T;
  slug?: T;
  summary?: T;
  industry?: T;
  featuredImage?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "email-templates_select".
 */
export interface EmailTemplatesSelect<T extends boolean = true> {
  name?: T;
  slug?: T;
  subject?: T;
  body?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "form-configs_select".
 */
export interface FormConfigsSelect<T extends boolean = true> {
  name?: T;
  formType?: T;
  fields?: T;
  destination?: T;
  autoresponderTemplate?: T;
  spamProtection?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "booking-profiles_select".
 */
export interface BookingProfilesSelect<T extends boolean = true> {
  name?: T;
  provider?: T;
  internalSlug?: T;
  durationMinutes?: T;
  availability?: T;
  bookingUrl?: T;
  assignedOwner?: T;
  thankYouPageSlug?: T;
  confirmationEmailTemplate?: T;
  tracking?: T;
  active?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "pages_select".
 */
export interface PagesSelect<T extends boolean = true> {
  title?: T;
  slug?: T;
  pageType?: T;
  status?: T;
  seo?:
    | T
    | {
        title?: T;
        description?: T;
        ogImage?: T;
      };
  hero?:
    | T
    | {
        headline?: T;
        subheadline?: T;
        backgroundMedia?: T;
      };
  primaryCta?:
    | T
    | {
        label?: T;
        href?: T;
      };
  layout?:
    | T
    | {
        hero?:
          | T
          | {
              headline?: T;
              subheadline?: T;
              backgroundMedia?: T;
              ctaLabel?: T;
              ctaHref?: T;
              id?: T;
              blockName?: T;
            };
        cta?:
          | T
          | {
              label?: T;
              href?: T;
              variant?: T;
              id?: T;
              blockName?: T;
            };
        proofBar?:
          | T
          | {
              logos?: T;
              id?: T;
              blockName?: T;
            };
        testimonialSlider?:
          | T
          | {
              testimonials?: T;
              id?: T;
              blockName?: T;
            };
        form?:
          | T
          | {
              formConfig?: T;
              id?: T;
              blockName?: T;
            };
        booking?:
          | T
          | {
              bookingProfile?: T;
              id?: T;
              blockName?: T;
            };
        faq?:
          | T
          | {
              items?:
                | T
                | {
                    question?: T;
                    answer?: T;
                    id?: T;
                  };
              id?: T;
              blockName?: T;
            };
        rich?:
          | T
          | {
              content?: T;
              id?: T;
              blockName?: T;
            };
        stats?:
          | T
          | {
              items?:
                | T
                | {
                    value?: T;
                    suffix?: T;
                    label?: T;
                    id?: T;
                  };
              variant?: T;
              id?: T;
              blockName?: T;
            };
        teamGrid?:
          | T
          | {
              sectionTitle?: T;
              intro?: T;
              members?: T;
              id?: T;
              blockName?: T;
            };
        caseStudyGrid?:
          | T
          | {
              sectionTitle?: T;
              studies?: T;
              id?: T;
              blockName?: T;
            };
        pricing?:
          | T
          | {
              sectionTitle?: T;
              intro?: T;
              plans?:
                | T
                | {
                    name?: T;
                    price?: T;
                    cadence?: T;
                    highlighted?: T;
                    description?: T;
                    bullets?:
                      | T
                      | {
                          text?: T;
                          id?: T;
                        };
                    ctaLabel?: T;
                    ctaHref?: T;
                    id?: T;
                  };
              footnote?: T;
              id?: T;
              blockName?: T;
            };
        comparison?:
          | T
          | {
              sectionTitle?: T;
              intro?: T;
              columns?:
                | T
                | {
                    heading?: T;
                    id?: T;
                  };
              rows?:
                | T
                | {
                    label?: T;
                    cells?:
                      | T
                      | {
                          value?: T;
                          id?: T;
                        };
                    id?: T;
                  };
              id?: T;
              blockName?: T;
            };
        process?:
          | T
          | {
              sectionTitle?: T;
              intro?: T;
              steps?:
                | T
                | {
                    badge?: T;
                    title?: T;
                    body?: T;
                    id?: T;
                  };
              id?: T;
              blockName?: T;
            };
      };
  defaultFormConfig?: T;
  defaultBookingProfile?: T;
  tracking?:
    | T
    | {
        offer?: T;
        industry?: T;
      };
  localizationAutomation?:
    | T
    | {
        autoQueueOnPublish?: T;
        sourceLocale?: T;
        targetLocales?: T;
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "ab-variants_select".
 */
export interface AbVariantsSelect<T extends boolean = true> {
  label?: T;
  page?: T;
  experimentSlug?: T;
  variantKey?: T;
  weight?: T;
  active?: T;
  heroHeadline?: T;
  heroSubheadline?: T;
  primaryCtaLabel?: T;
  primaryCtaHref?: T;
  seoTitle?: T;
  seoDescription?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "page-localizations_select".
 */
export interface PageLocalizationsSelect<T extends boolean = true> {
  page?: T;
  locale?: T;
  sourceLocale?: T;
  jobStatus?: T;
  lastError?: T;
  heroHeadline?: T;
  heroSubheadline?: T;
  seoTitle?: T;
  seoDescription?: T;
  layoutNotes?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "leads_select".
 */
export interface LeadsSelect<T extends boolean = true> {
  firstName?: T;
  lastName?: T;
  email?: T;
  phone?: T;
  company?: T;
  website?: T;
  serviceInterest?: T;
  industry?: T;
  sourcePage?: T;
  sourcePageSlug?: T;
  utm?: T;
  formType?: T;
  bookingStatus?: T;
  owner?: T;
  leadStatus?: T;
  crmSyncStatus?: T;
  notes?: T;
  consentMarketing?: T;
  idempotencyKey?: T;
  submissionExtras?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "booking-events_select".
 */
export interface BookingEventsSelect<T extends boolean = true> {
  lead?: T;
  bookingProfile?: T;
  providerEventId?: T;
  scheduledFor?: T;
  status?: T;
  rawPayload?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "crm-sync-logs_select".
 */
export interface CrmSyncLogsSelect<T extends boolean = true> {
  lead?: T;
  targetSystem?: T;
  status?: T;
  payload?: T;
  response?: T;
  syncedAt?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "email-logs_select".
 */
export interface EmailLogsSelect<T extends boolean = true> {
  lead?: T;
  template?: T;
  recipient?: T;
  status?: T;
  providerMessageId?: T;
  sentAt?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "tracking-events_select".
 */
export interface TrackingEventsSelect<T extends boolean = true> {
  eventType?: T;
  path?: T;
  metadata?: T;
  visitorKey?: T;
  updatedAt?: T;
  createdAt?: T;
}
/** Legacy `Config` select shape — not mapped to Drizzle in this app. */
export interface CmsLegacyKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}
/** Legacy `Config` select shape — not mapped to Drizzle in this app. */
export interface CmsLegacyLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/** Legacy `Config` select shape — not mapped to Drizzle in this app. */
export interface CmsLegacyPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/** Legacy `Config` select shape — not mapped to Drizzle in this app. */
export interface CmsLegacyMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "collections_widget".
 */
export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}
