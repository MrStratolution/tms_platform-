import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateEmailTemplateForm } from '@/components/console/ConsoleCreateEmailTemplateForm'

export const metadata: Metadata = {
  title: 'New SMTP email template',
}

export default function ConsoleNewEmailSystemTemplatePage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/email-system/templates">← SMTP email templates</Link>
      </p>
      <h1 className="tma-console-page-title">Create SMTP email template</h1>
      <p className="tma-console-lead">
        Add a German or English transactional template for the existing SMTP email system.
      </p>
      <ConsoleCreateEmailTemplateForm />
    </main>
  )
}
