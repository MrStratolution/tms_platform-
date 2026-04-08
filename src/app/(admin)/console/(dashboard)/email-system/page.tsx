import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ConsoleSmtpSettingsEditor } from '@/components/console/ConsoleSmtpSettingsEditor'
import { getCustomDb } from '@/db/client'
import { adminCopy } from '@/lib/adminI18n'
import { consoleUserCanManageIntegrations } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { getLatestSmtpSettings, listEmailLogs, listSystemEmailTemplates, toPublicSmtpSettings } from '@/lib/email/systemStore'

export const metadata: Metadata = {
  title: 'SMTP email',
}

export default async function ConsoleEmailSystemPage() {
  const session = await requireConsoleSession()
  if (!consoleUserCanManageIntegrations(session.role)) {
    redirect('/console')
  }

  const db = getCustomDb()
  const uiLocale = session.uiLocale === 'en' ? 'en' : 'de'
  const t = (key: Parameters<typeof adminCopy>[1]) => adminCopy(uiLocale, key)

  const smtpSettings = db ? toPublicSmtpSettings(await getLatestSmtpSettings(db)) : null
  const recentLogs = db ? await listEmailLogs(db, 5) : []
  const templates = db ? await listSystemEmailTemplates(db) : []

  return (
    <main className="tma-console-main wide">
      <div className="tma-console-actions tma-console-actions--settings-top">
        <div>
          <h1 className="tma-console-page-title">{t('navEmailSystem')}</h1>
          <p className="tma-console-lead">
            Configure the platform SMTP transport, verify delivery, and monitor recent email activity.
          </p>
        </div>
        <div className="tma-console-actions" style={{ gap: '0.75rem' }}>
          <Link href="/console/email-templates" className="tma-console-btn-secondary">
            Email templates
          </Link>
          <Link href="/console/email-system/logs" className="tma-console-btn-secondary">
            Email logs
          </Link>
        </div>
      </div>

      {!db ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert">
          Database is not configured.
        </p>
      ) : (
        <>
          <ConsoleSmtpSettingsEditor
            initialSettings={smtpSettings}
            canManage
            uiLocale={uiLocale}
          />

          <section className="tma-cms-cards" style={{ marginTop: '1.75rem' }}>
            <article className="tma-cms-card">
              <h2 className="tma-cms-card-title">Templates</h2>
              <p className="tma-cms-card-desc">
                {templates.length} configured template{templates.length === 1 ? '' : 's'} across German and English.
              </p>
              <span className="tma-cms-card-cta">
                <Link href="/console/email-templates">Manage templates →</Link>
              </span>
            </article>
            <article className="tma-cms-card">
              <h2 className="tma-cms-card-title">Recent logs</h2>
              {recentLogs.length === 0 ? (
                <p className="tma-cms-card-desc">No email logs yet.</p>
              ) : (
                <ul style={{ margin: '0.75rem 0 0', paddingInlineStart: '1rem' }}>
                  {recentLogs.map((row) => (
                    <li key={row.id}>
                      <code>{row.templateKey}</code> → {row.recipient} · {row.status}
                    </li>
                  ))}
                </ul>
              )}
              <span className="tma-cms-card-cta">
                <Link href="/console/email-system/logs">Open full log →</Link>
              </span>
            </article>
          </section>
        </>
      )}
    </main>
  )
}
