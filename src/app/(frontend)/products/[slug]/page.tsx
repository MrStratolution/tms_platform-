import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'

import { ProductPublicView } from '@/components/products/ProductPublicView'
import { getCustomDb } from '@/db/client'
import { cmsProducts } from '@/db/schema'
import { isMissingDbRelationError } from '@/lib/db/errors'
import { buildProductPublicMetadata } from '@/lib/pageMetadata'
import { getPublicSiteSettingsDocument } from '@/lib/siteSettings'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const db = getCustomDb()
  if (!db) return { title: 'Product' }

  try {
    const rows = await db
      .select({ name: cmsProducts.name, document: cmsProducts.document })
      .from(cmsProducts)
      .where(and(eq(cmsProducts.slug, slug), eq(cmsProducts.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) return { title: 'Not found' }

    const doc = row.document as { seo?: { title?: string; description?: string } }
    const site = await getPublicSiteSettingsDocument(db)
    return buildProductPublicMetadata(
      {
        name: row.name,
        seoTitle: doc?.seo?.title,
        seoDescription: doc?.seo?.description,
        slug,
      },
      site,
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) return { title: 'Product' }
    throw e
  }
}

export default async function PublicProductPage(props: Props) {
  const { slug } = await props.params
  const db = getCustomDb()
  if (!db) notFound()

  try {
    const rows = await db
      .select({
        name: cmsProducts.name,
        document: cmsProducts.document,
      })
      .from(cmsProducts)
      .where(and(eq(cmsProducts.slug, slug), eq(cmsProducts.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) notFound()

    return (
      <div className="tma-product-page">
        <ProductPublicView name={row.name} document={row.document} />
      </div>
    )
  } catch (e) {
    if (isMissingDbRelationError(e)) notFound()
    throw e
  }
}
