import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateDownloadAssetForm } from '@/components/console/ConsoleCreateDownloadAssetForm'

export const metadata: Metadata = {
  title: 'New download',
}

export default function ConsoleNewDownloadPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/downloads">← All downloads</Link>
      </p>
      <h1 className="tma-console-page-title">Create download asset</h1>
      <ConsoleCreateDownloadAssetForm />
    </main>
  )
}
