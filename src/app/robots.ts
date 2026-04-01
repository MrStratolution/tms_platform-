import type { MetadataRoute } from 'next'

import { getPublicSiteOrigin } from '@/lib/publicSiteUrl'

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteOrigin()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/console/', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
