import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsoleCreateProductForm } from '@/components/console/ConsoleCreateProductForm'
import { PRODUCT_CONTENT_KIND_VALUES, type ProductContentKind } from '@/types/cms'

export const metadata: Metadata = {
  title: 'New showcase entry',
}

type Props = {
  searchParams?: Promise<{ kind?: string | string[] }>
}

export default async function ConsoleNewProductPage(props: Props) {
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const rawKind = typeof searchParams?.kind === 'string' ? searchParams.kind : null
  const initialContentKind: ProductContentKind =
    rawKind && PRODUCT_CONTENT_KIND_VALUES.includes(rawKind as ProductContentKind)
      ? (rawKind as ProductContentKind)
      : 'product'

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
      <ConsoleCreateProductForm initialContentKind={initialContentKind} />
    </main>
  )
}
