import type { Metadata } from 'next'

import { ConsoleCreateEmailTemplateForm } from '@/components/console/ConsoleCreateEmailTemplateForm'

export const metadata: Metadata = {
  title: 'New email template',
}

export default function ConsoleNewEmailTemplatePage() {
  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">New email template</h1>
      <ConsoleCreateEmailTemplateForm />
    </main>
  )
}
