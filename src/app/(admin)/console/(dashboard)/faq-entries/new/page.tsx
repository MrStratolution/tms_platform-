import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateFaqEntryForm } from '@/components/console/ConsoleCreateFaqEntryForm'

export const metadata: Metadata = {
  title: 'New FAQ entry',
}

export default function ConsoleNewFaqEntryPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/faq-entries">← All FAQ entries</Link>
      </p>
      <h1 className="tma-console-page-title">Create FAQ entry</h1>
      <ConsoleCreateFaqEntryForm />
    </main>
  )
}
