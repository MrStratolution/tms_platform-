import type { Metadata } from 'next'
import Link from 'next/link'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { getCustomDb } from '@/db/client'
import {
  cmsBookingEvents,
  cmsCrmSyncLogs,
  cmsLeads,
  cmsPageLocalizations,
  cmsPages,
} from '@/db/schema'
import { adminCopy } from '@/lib/adminI18n'
import {
  consoleUserCanAdminTeam,
  userHasConsolePermission,
} from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'

export const metadata: Metadata = {
  title: 'Dashboard',
}

type CardDef = { href: string; title: string; description: string; cta: string }

export default async function ConsoleHomePage() {
  const session = await requireConsoleSession()
  const t = (key: Parameters<typeof adminCopy>[1]) => adminCopy(session.uiLocale, key)
  const showLeads = userHasConsolePermission(session.role, 'leads:read')
  const showTeam = consoleUserCanAdminTeam(session.role)
  const db = getCustomDb()

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const metrics = db
    ? await Promise.all([
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsLeads)
          .where(gte(cmsLeads.createdAt, startOfDay)),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsLeads)
          .where(and(eq(cmsLeads.leadStatus, 'qualified'), eq(cmsLeads.crmSyncStatus, 'pending'))),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsBookingEvents)
          .where(and(eq(cmsBookingEvents.status, 'confirmed'), gte(cmsBookingEvents.scheduledFor, now))),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsCrmSyncLogs)
          .where(eq(cmsCrmSyncLogs.status, 'failed')),
        db
          .select({
            id: cmsPages.id,
            title: cmsPages.title,
            updatedAt: cmsPages.updatedAt,
            lastEditedByEmail: cmsPages.lastEditedByEmail,
          })
          .from(cmsPages)
          .orderBy(desc(cmsPages.updatedAt))
          .limit(5),
        db
          .select({ value: sql<number>`count(*)` })
          .from(cmsPageLocalizations)
          .where(sql`${cmsPageLocalizations.jobStatus} <> 'ready'`),
        db
          .select({
            id: cmsBookingEvents.id,
            scheduledFor: cmsBookingEvents.scheduledFor,
          })
          .from(cmsBookingEvents)
          .where(and(eq(cmsBookingEvents.status, 'confirmed'), gte(cmsBookingEvents.scheduledFor, now), lte(cmsBookingEvents.scheduledFor, inSevenDays)))
          .orderBy(cmsBookingEvents.scheduledFor)
          .limit(5),
      ])
    : null

  const leadsToday = Number(metrics?.[0]?.[0]?.value ?? 0)
  const hotLeads = Number(metrics?.[1]?.[0]?.value ?? 0)
  const upcomingBookings = Number(metrics?.[2]?.[0]?.value ?? 0)
  const syncFailures = Number(metrics?.[3]?.[0]?.value ?? 0)
  const recentChanges = metrics?.[4] ?? []
  const translationWarnings = Number(metrics?.[5]?.[0]?.value ?? 0)
  const upcomingBookingRows = metrics?.[6] ?? []

  const contentCards: CardDef[] = [
    {
      href: '/console/pages',
      title: t('navPages'),
      description: 'Edit marketing pages: hero, SEO, primary CTA, and layout JSON stored in the database.',
      cta: 'Open pages →',
    },
    {
      href: '/console/media',
      title: t('navMedia'),
      description: 'Upload images and copy public URLs into your page content.',
      cta: 'Manage media →',
    },
    {
      href: '/console/products',
      title: t('navProducts'),
      description: 'Product records and JSON for campaigns; published items surface on the products API.',
      cta: 'Open products →',
    },
  ]

  const captureCards: CardDef[] = [
    {
      href: '/console/forms',
      title: 'Form configs',
      description: 'Contact and lead forms: fields, destinations, and autoresponder links.',
      cta: 'Configure forms →',
    },
    {
      href: '/console/booking-profiles',
      title: 'Booking',
      description: 'Native scheduling profiles: availability, copy, and confirmation emails.',
      cta: 'Booking settings →',
    },
  ]

  const orgCards: CardDef[] = [
    {
      href: '/console/settings',
      title: 'Settings',
      description: 'Console preferences (more options will land here over time).',
      cta: 'Open settings →',
    },
  ]

  if (showTeam) {
    orgCards.push({
      href: '/console/team',
      title: 'Team',
      description: 'Console admin users and roles (admin-only).',
      cta: 'View team →',
    })
  }

  const leadsCard: CardDef | null = showLeads
    ? {
        href: '/console/leads',
        title: 'Leads',
        description: 'Form submissions and booking-related leads with CRM sync status.',
        cta: 'View leads →',
      }
    : null

  return (
      <main className="tma-console-main wide">
      <h1 className="tma-cms-dashboard-title">{t('dashboardTitle')}</h1>
      <p className="tma-cms-dashboard-lead">
        {t('dashboardLead')} Signed in as <strong>{session.email}</strong> (role: <code>{session.role}</code>).
      </p>

      <section className="tma-cms-cards" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: t('dashboardLeadsToday'), value: leadsToday },
          { label: t('dashboardHotLeads'), value: hotLeads },
          { label: t('dashboardUpcomingBookings'), value: upcomingBookings },
          { label: t('dashboardOverdueReminders'), value: 0 },
          { label: t('dashboardSyncFailures'), value: syncFailures },
          { label: t('dashboardTranslationWarnings'), value: translationWarnings },
        ].map((item) => (
          <article key={item.label} className="tma-cms-card">
            <h2 className="tma-cms-card-title">{item.label}</h2>
            <p className="tma-cms-card-desc" style={{ fontSize: '2rem', fontWeight: 700 }}>
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <h2 className="tma-console-subheading">Website content</h2>
      <div className="tma-cms-cards" style={{ marginBottom: '1.75rem' }}>
        {contentCards.map((c) => (
          <Link key={c.href} href={c.href} className="tma-cms-card">
            <h3 className="tma-cms-card-title">{c.title}</h3>
            <p className="tma-cms-card-desc">{c.description}</p>
            <span className="tma-cms-card-cta">{c.cta}</span>
          </Link>
        ))}
      </div>

      <h2 className="tma-console-subheading">Leads &amp; booking</h2>
      <div className="tma-cms-cards" style={{ marginBottom: '1.75rem' }}>
        {captureCards.map((c) => (
          <Link key={c.href} href={c.href} className="tma-cms-card">
            <h3 className="tma-cms-card-title">{c.title}</h3>
            <p className="tma-cms-card-desc">{c.description}</p>
            <span className="tma-cms-card-cta">{c.cta}</span>
          </Link>
        ))}
        {leadsCard ? (
          <Link href={leadsCard.href} className="tma-cms-card">
            <h3 className="tma-cms-card-title">{leadsCard.title}</h3>
            <p className="tma-cms-card-desc">{leadsCard.description}</p>
            <span className="tma-cms-card-cta">{leadsCard.cta}</span>
          </Link>
        ) : (
          <div className="tma-cms-card" style={{ pointerEvents: 'none', opacity: 0.65 }}>
            <h3 className="tma-cms-card-title">Leads</h3>
            <p className="tma-cms-card-desc">
              Your role does not include lead access. Ask an admin to assign <code>ops</code> if you
              need pipeline and PII access.
            </p>
          </div>
        )}
      </div>

      <h2 className="tma-console-subheading">Organization</h2>
      <div className="tma-cms-cards" style={{ marginBottom: '1.75rem' }}>
        {orgCards.map((c) => (
          <Link key={c.href} href={c.href} className="tma-cms-card">
            <h3 className="tma-cms-card-title">{c.title}</h3>
            <p className="tma-cms-card-desc">{c.description}</p>
            <span className="tma-cms-card-cta">{c.cta}</span>
          </Link>
        ))}
      </div>

      <section className="tma-cms-cards" style={{ marginBottom: '1.75rem' }}>
        <article className="tma-cms-card">
          <h2 className="tma-cms-card-title">{t('dashboardRecentChanges')}</h2>
          {recentChanges.length === 0 ? (
            <p className="tma-cms-card-desc">{t('dashboardEmpty')}</p>
          ) : (
            <ul style={{ margin: '0.75rem 0 0', paddingInlineStart: '1rem' }}>
              {recentChanges.map((row) => (
                <li key={row.id}>
                  <Link href={`/console/pages/${row.id}`}>{row.title}</Link>{' '}
                  <span className="tma-cms-card-desc">
                    {row.lastEditedByEmail ? `· ${row.lastEditedByEmail}` : ''} ·{' '}
                    {row.updatedAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="tma-cms-card">
          <h2 className="tma-cms-card-title">{t('dashboardUpcomingBookings')}</h2>
          {upcomingBookingRows.length === 0 ? (
            <p className="tma-cms-card-desc">{t('dashboardEmpty')}</p>
          ) : (
            <ul style={{ margin: '0.75rem 0 0', paddingInlineStart: '1rem' }}>
              {upcomingBookingRows.map((row) => (
                <li key={row.id}>
                  {row.scheduledFor ? new Date(row.scheduledFor).toLocaleString() : '—'}
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="tma-cms-card">
          <h2 className="tma-cms-card-title">{t('dashboardAiSummary')}</h2>
          <p className="tma-cms-card-desc">
            {translationWarnings > 0
              ? `${translationWarnings} translation jobs need attention.`
              : 'No active AI translation warnings.'}
          </p>
          <p className="tma-cms-card-desc">
            {syncFailures > 0
              ? `${syncFailures} CRM sync failures need review.`
              : 'CRM sync queue is healthy.'}
          </p>
        </article>
      </section>

      <div className="tma-console-note">
        First-time setup: <code>npm run db:custom:migrate</code> then <code>npm run seed</code> for
        demo content. Runbook: <code>docs/CONSOLE_CMS_RUNBOOK.md</code>.
      </div>
    </main>
  )
}
