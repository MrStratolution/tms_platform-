import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateProductForm } from '@/components/console/ConsoleCreateProductForm'

export const metadata: Metadata = {
  title: 'New showcase entry',
}

export default function ConsoleNewProductPage() {
  return (
    <main className="tma-console-main wide">
      <p className="tma-console-back">
        <Link href="/console/products">← All entries</Link>
      </p>
      <h1 className="tma-console-page-title">Create showcase entry</h1>
      <p className="tma-console-lead">
        Inserts into <code>cms_product</code>. Use this for project, product, concept, or
        initiative entries rendered publicly at <code>/products/[slug]</code>.
      </p>
      <ConsoleCreateProductForm />
    </main>
  )
}
