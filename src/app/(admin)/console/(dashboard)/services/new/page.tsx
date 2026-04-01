import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateServiceForm } from '@/components/console/ConsoleCreateServiceForm'

export const metadata: Metadata = { title: 'New Service' }

export default function ConsoleNewServicePage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/services">← All services</Link></p>
      <h1 className="tma-console-page-title">Create service</h1>
      <p className="tma-console-lead">Add a reusable service entity for lead qualification and content modeling.</p>
      <ConsoleCreateServiceForm />
    </main>
  )
}
