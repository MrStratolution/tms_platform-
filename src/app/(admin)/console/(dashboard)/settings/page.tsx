import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'

import { ConsoleProfileSettingsForm } from '@/components/console/ConsoleProfileSettingsForm'
import { ConsoleSiteSettingsEditor } from '@/components/console/ConsoleSiteSettingsEditor'
import { getCustomDb } from '@/db/client'
import { adminUsers } from '@/db/schema'
import { consoleUserCanEditCustomCss, consoleUserCanWriteContent } from '@/lib/console/rbac'
import { requireConsoleSession } from '@/lib/console/requireConsoleSession'
import { ensureSiteSettingsRow, parseSiteSettingsDocument } from '@/lib/siteSettings'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function ConsoleSettingsPage() {
  const session = await requireConsoleSession()
  const canEdit = consoleUserCanWriteContent(session.role)
  const canEditCustomCss = consoleUserCanEditCustomCss(session.role)
  const db = getCustomDb()
  const profileRows =
    db
      ? await db
          .select({
            displayName: adminUsers.displayName,
            whatsappNumber: adminUsers.whatsappNumber,
          })
          .from(adminUsers)
          .where(eq(adminUsers.id, session.sub))
          .limit(1)
      : []
  const profile = profileRows[0]

  let siteDocument = parseSiteSettingsDocument({})
  if (db) {
    const row = await ensureSiteSettingsRow(db)
    siteDocument = parseSiteSettingsDocument(row.document)
  }

  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">Settings</h1>
      <p className="tma-console-lead">
        Global site settings: branding, design tokens, typography, colors, layout, header/footer,
        contact info, social links, SEO defaults, tracking, motion, and advanced CSS. Page-specific
        overrides still win when set on each page.
      </p>

      <section className="tma-console-settings-block">
        <h2 className="tma-console-subheading">Your profile</h2>
        <p className="tma-console-note">
          Manage your personal console details here. Your WhatsApp number is used for the lead
          copilot action that sends AI summaries to your own WhatsApp chat.
        </p>

        <dl className="tma-console-dl" style={{ marginBottom: '1.25rem' }}>
          <div className="tma-console-dl-row">
            <dt>Email</dt>
            <dd>
              <code>{session.email}</code>
            </dd>
          </div>
          <div className="tma-console-dl-row">
            <dt>Role</dt>
            <dd>
              <code>{session.role}</code>
            </dd>
          </div>
          <div className="tma-console-dl-row">
            <dt>User ID</dt>
            <dd>
              <code>{session.sub}</code>
            </dd>
          </div>
        </dl>

        <ConsoleProfileSettingsForm
          initialDisplayName={profile?.displayName ?? null}
          initialWhatsappNumber={profile?.whatsappNumber ?? null}
        />
      </section>

      {!db ? (
        <p className="tma-console-lead tma-console-lead--error" role="alert" style={{ marginTop: '2rem' }}>
          Database is not configured. Set <code>DATABASE_URL</code> to edit site settings.
        </p>
      ) : (
        <div className="tma-console-settings-block" style={{ marginTop: '2rem' }}>
          <h2 className="tma-console-subheading">Site-wide settings</h2>
          <p className="tma-console-note">
            Changes apply to the public site after you save. Scroll through all sections: branding,
            typography, layout tokens, colors, header/footer, contact info, social links, SEO defaults,
            tracking, motion, and custom CSS — then save (buttons at the top and bottom).
          </p>
          <details className="tma-console-details-advanced" style={{ marginBottom: '1.25rem' }}>
            <summary className="tma-console-details-advanced__summary">Troubleshooting (developers)</summary>
            <p className="tma-console-hint" style={{ margin: '0.5rem 0 0' }}>
              Settings are stored in <code>tma_custom.cms_site_settings</code>. If the table is
              missing, run <code>npm run db:custom:migrate</code> against your database.
            </p>
          </details>
          <ConsoleSiteSettingsEditor
            initialDocument={siteDocument}
            canEdit={canEdit}
            canEditCustomCss={canEditCustomCss}
          />
        </div>
      )}

      <div className="tma-console-note" style={{ marginTop: '2rem' }}>
        Password resets and new admin invites are currently done in the database (e.g. Drizzle Studio)
        or your deployment process.
      </div>
    </main>
  )
}
