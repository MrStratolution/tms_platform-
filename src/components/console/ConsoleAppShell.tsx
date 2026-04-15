'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { ConsoleLocaleSwitcher } from '@/components/console/ConsoleLocaleSwitcher'
import { ConsoleLogoutButton } from '@/components/console/ConsoleLogoutButton'
import { adminCopy, normalizeAdminUiLocale } from '@/lib/adminI18n'
import { consoleUserCanAdminTeam, userHasConsolePermission } from '@/lib/console/rbac'

type NavItem = { href: string; label: string; description?: string }

const NAV_CONTENT: NavItem[] = [
  { href: '/console', label: 'Dashboard', description: 'Overview' },
  { href: '/console/pages', label: 'Pages', description: 'Site content & layout' },
  { href: '/console/news', label: 'News / Blog', description: 'Articles & editorial pages' },
  { href: '/console/services', label: 'Services', description: 'Offer directory' },
  { href: '/console/industries', label: 'Industries', description: 'Market directory' },
  { href: '/console/media', label: 'Media', description: 'Images & file URLs' },
  { href: '/console/products', label: 'Projects & Products', description: 'Showcase entries' },
]

const NAV_LIBRARIES: NavItem[] = [
  { href: '/console/layout-blocks', label: 'Saved blocks', description: 'Reusable sections' },
  { href: '/console/testimonials', label: 'Testimonials', description: 'Reusable quotes' },
  { href: '/console/faq-entries', label: 'FAQ entries', description: 'Reusable Q&A' },
  { href: '/console/downloads', label: 'Downloads', description: 'File assets' },
  { href: '/console/team-members', label: 'Team members', description: 'Public team profiles' },
  { href: '/console/case-studies', label: 'Case studies', description: 'Portfolio entries' },
]

const NAV_CAPTURE: NavItem[] = [
  { href: '/console/forms', label: 'Forms', description: 'Field configs' },
  { href: '/console/email-templates', label: 'Email templates', description: 'Autoresponders' },
  { href: '/console/email-system', label: 'SMTP email', description: 'Templates & delivery' },
  { href: '/console/booking-profiles', label: 'Booking', description: 'Schedules' },
]

const NAV_ORG: NavItem[] = [
  { href: '/console/settings', label: 'Settings', description: 'Preferences' },
]

function pathMatches(pathname: string, href: string): boolean {
  if (href === '/console') return pathname === '/console' || pathname === '/console/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ConsoleAppShell(props: {
  email: string
  userRole: string
  userLocale: string
  children: React.ReactNode
}) {
  const { email, userRole, userLocale, children } = props
  const pathname = usePathname() || ''
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const uiLocale = normalizeAdminUiLocale(userLocale)

  const showTeam = consoleUserCanAdminTeam(userRole)
  const showLeads = userHasConsolePermission(userRole, 'leads:read')

  const closeMobile = useCallback(() => setMobileNavOpen(false), [])

  useEffect(() => {
    closeMobile()
  }, [pathname, closeMobile])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  function renderNavLink(item: NavItem) {
    const active = pathMatches(pathname, item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`tma-cms-nav-item${active ? ' tma-cms-nav-item--active' : ''}`}
        onClick={closeMobile}
      >
        <span className="tma-cms-nav-item-label">{item.label}</span>
        {item.description ? (
          <span className="tma-cms-nav-item-desc">{item.description}</span>
        ) : null}
      </Link>
    )
  }

  const leadsItems: NavItem[] = showLeads
    ? [{ href: '/console/leads', label: adminCopy(uiLocale, 'navLeads'), description: 'Submissions' }]
    : []
  const teamItems: NavItem[] = showTeam
    ? [{ href: '/console/team', label: adminCopy(uiLocale, 'navTeam'), description: 'Admins' }]
    : []

  return (
    <div className="tma-cms-app">
      {mobileNavOpen ? (
        <button
          type="button"
          className="tma-cms-backdrop"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        id="tma-cms-sidebar"
        className={`tma-cms-sidebar${mobileNavOpen ? ' tma-cms-sidebar--open' : ''}`}
      >
        <div className="tma-cms-sidebar-brand">
          <Link href="/console" className="tma-cms-sidebar-title" onClick={closeMobile}>
            TMA CMS
          </Link>
          <span className="tma-cms-sidebar-badge">Admin</span>
        </div>
        <p className="tma-cms-sidebar-note">
          {adminCopy(uiLocale, 'shellSeparate')}
        </p>

        <nav className="tma-cms-nav" aria-label="CMS sections">
          <p className="tma-cms-nav-heading">{adminCopy(uiLocale, 'shellContent')}</p>
          {NAV_CONTENT.map((item) =>
            renderNavLink({
              ...item,
              label:
                item.href === '/console'
                  ? adminCopy(uiLocale, 'navDashboard')
                  : item.href === '/console/pages'
                    ? adminCopy(uiLocale, 'navPages')
                    : item.href === '/console/news'
                      ? adminCopy(uiLocale, 'navNews')
                    : item.href === '/console/services'
                      ? adminCopy(uiLocale, 'navServices')
                      : item.href === '/console/industries'
                        ? adminCopy(uiLocale, 'navIndustries')
                        : item.href === '/console/media'
                          ? adminCopy(uiLocale, 'navMedia')
                          : adminCopy(uiLocale, 'navProducts'),
            }),
          )}
          <p className="tma-cms-nav-heading">{adminCopy(uiLocale, 'shellLibraries')}</p>
          {NAV_LIBRARIES.map((item) =>
            renderNavLink({
              ...item,
              label:
                item.href === '/console/layout-blocks'
                  ? adminCopy(uiLocale, 'navSavedBlocks')
                  : item.href === '/console/testimonials'
                    ? adminCopy(uiLocale, 'navTestimonials')
                    : item.href === '/console/faq-entries'
                      ? adminCopy(uiLocale, 'navFaq')
                      : item.href === '/console/downloads'
                        ? adminCopy(uiLocale, 'navDownloads')
                        : item.href === '/console/team-members'
                          ? adminCopy(uiLocale, 'navTeamMembers')
                          : adminCopy(uiLocale, 'navCaseStudies'),
            }),
          )}
          <p className="tma-cms-nav-heading">{adminCopy(uiLocale, 'shellCapture')}</p>
          {NAV_CAPTURE.map((item) =>
            renderNavLink({
              ...item,
              label:
                item.href === '/console/forms'
                  ? adminCopy(uiLocale, 'navForms')
                  : item.href === '/console/email-templates'
                    ? adminCopy(uiLocale, 'navEmailTemplates')
                    : item.href === '/console/email-system'
                      ? adminCopy(uiLocale, 'navEmailSystem')
                    : adminCopy(uiLocale, 'navBooking'),
            }),
          )}
          {leadsItems.map(renderNavLink)}
          <p className="tma-cms-nav-heading">{adminCopy(uiLocale, 'shellOrganization')}</p>
          {NAV_ORG.map((item) => renderNavLink({ ...item, label: adminCopy(uiLocale, 'navSettings') }))}
          {teamItems.map(renderNavLink)}
        </nav>
      </aside>

      <div className="tma-cms-main-col">
        <header className="tma-cms-topbar">
          <button
            type="button"
            className="tma-cms-menu-btn"
            aria-expanded={mobileNavOpen}
            aria-controls="tma-cms-sidebar"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {adminCopy(uiLocale, 'shellMenu')}
          </button>
          <div className="tma-cms-topbar-actions">
            <ConsoleLocaleSwitcher initialLocale={uiLocale} />
            <Link
              href="/"
              className="tma-cms-view-site"
              target="_blank"
              rel="noopener noreferrer"
            >
              {adminCopy(uiLocale, 'shellViewSite')}
            </Link>
            <span className="tma-cms-topbar-user" title={email}>
              {email}
            </span>
            <ConsoleLogoutButton />
          </div>
        </header>
        <div className="tma-cms-content">{children}</div>
      </div>
    </div>
  )
}
