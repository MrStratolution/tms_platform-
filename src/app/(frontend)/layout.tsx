import '@/styles/tma.css'

import { Inter, Syne } from 'next/font/google'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import React from 'react'

import { PublicGtm } from '@/components/tma/PublicGtm'
import { PublicThemeCss } from '@/components/tma/PublicThemeCss'
import { SiteFooter } from '@/components/tma/SiteFooter'
import { SiteHeader } from '@/components/tma/SiteHeader'
import { isRtlLocale, resolvePublicHtmlLang } from '@/lib/localeDirection'
import { loadSiteSettingsForPublic, mergeRootLayoutMetadata } from '@/lib/siteSettings'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSiteSettingsForPublic()
  return mergeRootLayoutMetadata(site)
}

export default async function FrontendLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const headerStore = await headers()
  const cookieStore = await cookies()
  const htmlLang = resolvePublicHtmlLang(
    headerStore.get('x-tma-active-lang'),
    cookieStore.get('tma_lang')?.value,
  )
  const dir = isRtlLocale(htmlLang) ? 'rtl' : 'ltr'
  const site = await loadSiteSettingsForPublic()

  return (
    <html lang={htmlLang} dir={dir} className={`${inter.variable} ${syne.variable}`}>
      <body className="tma-body">
        <PublicThemeCss site={site} />
        <PublicGtm gtmContainerId={site?.gtmContainerId} />
        <SiteHeader site={site} />
        <main className="tma-main">{children}</main>
        <SiteFooter site={site} />
      </body>
    </html>
  )
}
