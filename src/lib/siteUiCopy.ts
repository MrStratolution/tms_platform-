/**
 * Static chrome strings for the public site (header/footer). CMS pages stay in the database.
 */

const STRINGS: Record<string, Record<string, string>> = {
  de: {
    navHome: 'Start',
    navConsole: 'Konsole',
    langLabel: 'Sprache',
    footerTagline: 'The Modesty Argument',
    footerStrapline: 'Bescheiden, aber mutig. Eine Umsatzplattform für ernsthafte Marken.',
    footerRights: 'Alle Rechte vorbehalten.',
  },
  en: {
    navHome: 'Home',
    navConsole: 'Console',
    langLabel: 'Language',
    footerTagline: 'The Modesty Argument',
    footerStrapline: 'Modest but bold. A revenue platform for serious brands.',
    footerRights: 'All rights reserved.',
  },
}

export type SiteUiKey = keyof typeof STRINGS.en

export function siteUiCopy(locale: string | null | undefined, key: SiteUiKey): string {
  const raw = locale?.trim() || 'de'
  if (STRINGS[raw]?.[key]) return STRINGS[raw][key]
  const primary = raw.split('-')[0]?.toLowerCase() || 'de'
  if (STRINGS[primary]?.[key]) return STRINGS[primary][key]
  return STRINGS.de[key]
}
