import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateIndustryForm } from '@/components/console/ConsoleCreateIndustryForm'

export const metadata: Metadata = { title: 'New Industry' }

export default function ConsoleNewIndustryPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/industries">← All industries</Link></p>
      <h1 className="tma-console-page-title">Create industry</h1>
      <p className="tma-console-lead">Add a reusable industry entity for attribution and vertical messaging.</p>
      <ConsoleCreateIndustryForm />
    </main>
  )
}
