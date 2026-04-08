import { cookies, headers } from 'next/headers'
import type { Metadata } from 'next'
import Link from 'next/link'
import React, { cache } from 'react'

import { PageLivePreview } from '@/components/pages/PageLivePreview'
import { tryGetCmsDb } from '@/lib/cmsData'
import { isAnalyticsAllowed } from '@/lib/cookieConsent'
import { resolvePageForPublicView } from '@/lib/mergePublicPage'
import { getPublishedHomePage } from '@/lib/pages'
import { normalizePublicLocale } from '@/lib/publicLocale'
import { firstQueryParam } from '@/lib/queryParam'
import { getPublicShortcodeVars } from '@/lib/publicShortcodeVars'
import { buildPublicPageMetadata } from '@/lib/pageMetadata'
import { loadSiteSettingsForPublic, mergeRootLayoutMetadata } from '@/lib/siteSettings'
import { serializePageForClient } from '@/lib/serializePage'

/** Needs DB; avoids failed static prerender when Postgres is down at build time. */
export const dynamic = 'force-dynamic'

const getHomeContext = cache(tryGetCmsDb)

type HomeProps = {
  params?: Promise<Record<string, never>>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(props: HomeProps): Promise<Metadata> {
  const sp = props.searchParams ? await props.searchParams : undefined
  const ctx = getHomeContext()
  const site = await loadSiteSettingsForPublic()
  if (!ctx.ok) {
    return mergeRootLayoutMetadata(site)
  }
  let cmsHome: Awaited<ReturnType<typeof getPublishedHomePage>> = null
  try {
    cmsHome = await getPublishedHomePage(ctx.db)
  } catch {
    cmsHome = null
  }
  if (cmsHome) {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const locale = normalizePublicLocale(
      firstQueryParam(sp, 'lang') ??
        headerStore.get('x-tma-active-lang') ??
        cookieStore.get('tma_lang')?.value,
    )
    const merged = await resolvePageForPublicView(ctx.db, cmsHome, {
      cookieStore,
      queryVariant: firstQueryParam(sp, 'tma_variant'),
      queryLang: locale,
    })
    return buildPublicPageMetadata(merged, '', site)
  }
  return mergeRootLayoutMetadata(site)
}

export default async function HomePage(props: HomeProps) {
  const sp = props.searchParams ? await props.searchParams : undefined
  const ctx = getHomeContext()

  if (!ctx.ok) {
    return (
      <div className="home">
        <div className="content">
          <h1>TMA platform</h1>
          <p className="tagline">
            Next.js + Node.js + PostgreSQL — backend-managed pages, leads, and booking.
          </p>
          <div className="db-alert" role="status">
            <h2>PostgreSQL is not running</h2>
            <p>
              The site and API routes need a live database. Until Postgres accepts connections,
              those pages will not work — this is expected, not a broken install.
            </p>
            <ol>
              <li>
                From the project folder, start the database: <code>npm run db:up</code>
              </li>
              <li>
                Confirm <code>DATABASE_URL</code> in <code>.env</code> (see{' '}
                <code>.env.example</code>).
              </li>
              <li>
                Run <code>npm run db:custom:migrate</code> then <code>npm run seed</code> for demo
                content.
              </li>
              <li>Wait a few seconds, then refresh.</li>
            </ol>
          </div>
          <div className="links">
            <Link className="admin" href="/console/login">
              Console login (after DB is up)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  let cmsHome: Awaited<ReturnType<typeof getPublishedHomePage>> = null
  try {
    cmsHome = await getPublishedHomePage(ctx.db)
  } catch {
    cmsHome = null
  }
  if (cmsHome) {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const locale = normalizePublicLocale(
      firstQueryParam(sp, 'lang') ??
        headerStore.get('x-tma-active-lang') ??
        cookieStore.get('tma_lang')?.value,
    )
    const site = await loadSiteSettingsForPublic()
    const merged = await resolvePageForPublicView(ctx.db, cmsHome, {
      cookieStore,
      queryVariant: firstQueryParam(sp, 'tma_variant'),
      queryLang: locale,
    })
    const embedShortcodeVars = await getPublicShortcodeVars()
    return (
      <PageLivePreview
        page={serializePageForClient(merged)}
        embedShortcodeVars={embedShortcodeVars}
        locale={locale}
        trackingConsentGranted={isAnalyticsAllowed(
          cookieStore.get('tma_cookie_consent')?.value,
          site,
        )}
      />
    )
  }

  return (
    <div className="home">
      <div className="content">
        <h1>TMA platform</h1>
        <p className="tagline">
          Next.js + Node.js + PostgreSQL — custom admin at <code>/console</code>, CMS data in{' '}
          <code>tma_custom</code>.
        </p>
        <div className="links">
          <Link className="admin" href="/console/login">
            Open console
          </Link>
          <span className="muted">
            Run <code>npm run seed</code> after migrations to load demo pages, or publish a page
            with <code>pageType: &quot;home&quot;</code> in the console.
          </span>
        </div>
      </div>
    </div>
  )
}
