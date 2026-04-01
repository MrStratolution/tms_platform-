import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateLayoutBlockForm } from '@/components/console/ConsoleCreateLayoutBlockForm'

export const metadata: Metadata = {
  title: 'New saved block',
}

export default function ConsoleNewLayoutBlockPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/layout-blocks">← All saved blocks</Link>
      </p>
      <h1 className="tma-console-page-title">Create saved block</h1>
      <ConsoleCreateLayoutBlockForm />
    </main>
  )
}
