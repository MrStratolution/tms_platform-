import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateCaseStudyForm } from '@/components/console/ConsoleCreateCaseStudyForm'

export const metadata: Metadata = { title: 'New case study' }

export default function ConsoleNewCaseStudyPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back"><Link href="/console/case-studies">← All case studies</Link></p>
      <h1 className="tma-console-page-title">Create case study</h1>
      <ConsoleCreateCaseStudyForm />
    </main>
  )
}
