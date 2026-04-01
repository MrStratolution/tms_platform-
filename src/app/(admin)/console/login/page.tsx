import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleLoginEnvBanner } from '@/components/console/ConsoleLoginEnvBanner'
import { ConsoleLoginForm } from '@/components/console/ConsoleLoginForm'

export const metadata: Metadata = {
  title: 'CMS sign in',
}

export default function ConsoleLoginPage() {
  return (
    <div className="tma-console-login-wrap">
      <div className="tma-console-login-card">
        <p className="tma-cms-sidebar-badge" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
          Admin only
        </p>
        <h1>TMA CMS</h1>
        <p>
          Sign in to edit pages, media, forms, booking, and leads. This is{' '}
          <strong>not</strong> the public marketing site — visitors use the homepage at{' '}
          <code>/</code>.
        </p>
        <ConsoleLoginEnvBanner />
        <ConsoleLoginForm />
        <div className="tma-cms-login-public">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Open public website in a new tab →
          </Link>
        </div>
      </div>
    </div>
  )
}
