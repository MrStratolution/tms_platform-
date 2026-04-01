import type { Metadata } from 'next'

import { ConsoleCreateFormConfigForm } from '@/components/console/ConsoleCreateFormConfigForm'

export const metadata: Metadata = {
  title: 'New form config',
}

export default function ConsoleNewFormConfigPage() {
  return (
    <main className="tma-console-main wide">
      <h1 className="tma-console-page-title">New form config</h1>
      <ConsoleCreateFormConfigForm />
    </main>
  )
}
