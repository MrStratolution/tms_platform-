export const ADMIN_UI_LOCALES = ['de', 'en'] as const

export type AdminUiLocale = (typeof ADMIN_UI_LOCALES)[number]

export function normalizeAdminUiLocale(value: string | null | undefined): AdminUiLocale {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'de'
}

const COPY = {
  de: {
    navDashboard: 'Dashboard',
    navPages: 'Seiten',
    navNews: 'News / Blog',
    navMedia: 'Medien',
    navProducts: 'Projekte & Produkte',
    navServices: 'Services',
    navIndustries: 'Branchen',
    navSavedBlocks: 'Gespeicherte Blöcke',
    navTestimonials: 'Testimonials',
    navFaq: 'FAQ-Einträge',
    navDownloads: 'Downloads',
    navTeamMembers: 'Teammitglieder',
    navCaseStudies: 'Case Studies',
    navForms: 'Formulare',
    navEmailTemplates: 'E-Mail-Vorlagen',
    navEmailSystem: 'SMTP-E-Mails',
    navBooking: 'Buchung',
    navLeads: 'Leads',
    navSettings: 'Einstellungen',
    navTeam: 'Team',
    shellContent: 'Inhalte',
    shellLibraries: 'Bibliotheken',
    shellCapture: 'Lead-Erfassung',
    shellOrganization: 'Organisation',
    shellSeparate: 'Dieser Bereich ist getrennt von der öffentlichen Website.',
    shellViewSite: 'Website ansehen',
    shellMenu: 'Menü',
    dashboardTitle: 'Operations-Dashboard',
    dashboardLead:
      'Zentrale Übersicht für Inhalte, Leads, Buchungen, Übersetzungen und Systemzustand.',
    dashboardLeadsToday: 'Leads heute',
    dashboardHotLeads: 'Heiße Leads',
    dashboardUpcomingBookings: 'Anstehende Buchungen',
    dashboardOverdueReminders: 'Überfällige Erinnerungen',
    dashboardSyncFailures: 'Sync-Fehler',
    dashboardRecentChanges: 'Letzte Inhaltsänderungen',
    dashboardTranslationWarnings: 'Übersetzungswarnungen',
    dashboardAiSummary: 'KI-Aktivität',
    dashboardEmpty: 'Noch keine Daten',
    createPageTitle: 'Seite erstellen',
    createPageLead:
      'Erstelle eine neue Seite für die Website. Slug muss eindeutig sein. Inhalte und Abschnitte bearbeitest du im nächsten Schritt ohne Code.',
    createPageHint:
      'Wähle unten ein Starter-Layout. Texte und Abschnitte kannst du im nächsten Schritt anpassen.',
    createPageSlug: 'URL-Slug',
    createPageTitleField: 'Titel',
    createPageType: 'Seitentyp',
    createPageTemplate: 'Startlayout',
    createPageStatus: 'Startstatus',
    createPageSubmit: 'Seite erstellen',
    language: 'Sprache',
    profile: 'Profil',
  },
  en: {
    navDashboard: 'Dashboard',
    navPages: 'Pages',
    navNews: 'News / Blog',
    navMedia: 'Media',
    navProducts: 'Projects & Products',
    navServices: 'Services',
    navIndustries: 'Industries',
    navSavedBlocks: 'Saved blocks',
    navTestimonials: 'Testimonials',
    navFaq: 'FAQ entries',
    navDownloads: 'Downloads',
    navTeamMembers: 'Team members',
    navCaseStudies: 'Case studies',
    navForms: 'Forms',
    navEmailTemplates: 'Email templates',
    navEmailSystem: 'SMTP email',
    navBooking: 'Booking',
    navLeads: 'Leads',
    navSettings: 'Settings',
    navTeam: 'Team',
    shellContent: 'Content',
    shellLibraries: 'Libraries',
    shellCapture: 'Capture',
    shellOrganization: 'Organization',
    shellSeparate: 'This area is separate from the public website.',
    shellViewSite: 'View public site',
    shellMenu: 'Menu',
    dashboardTitle: 'Operations dashboard',
    dashboardLead:
      'Central overview for content, leads, bookings, translations, and platform health.',
    dashboardLeadsToday: 'Leads today',
    dashboardHotLeads: 'Hot leads',
    dashboardUpcomingBookings: 'Upcoming bookings',
    dashboardOverdueReminders: 'Overdue reminders',
    dashboardSyncFailures: 'Sync failures',
    dashboardRecentChanges: 'Recent content changes',
    dashboardTranslationWarnings: 'Translation warnings',
    dashboardAiSummary: 'AI activity',
    dashboardEmpty: 'No data yet',
    createPageTitle: 'Create page',
    createPageLead:
      'Create a new page for the public site. Slugs must be unique. You will edit sections and content on the next screen without code.',
    createPageHint:
      'Pick a starter layout below. You can customize text and sections on the next screen.',
    createPageSlug: 'URL slug',
    createPageTitleField: 'Title',
    createPageType: 'Page type',
    createPageTemplate: 'Starting layout',
    createPageStatus: 'Initial status',
    createPageSubmit: 'Create page',
    language: 'Language',
    profile: 'Profile',
  },
} as const

export type AdminCopyKey = keyof (typeof COPY)['de']

export function adminCopy(locale: string | null | undefined, key: AdminCopyKey): string {
  const ui = normalizeAdminUiLocale(locale)
  return COPY[ui][key]
}
