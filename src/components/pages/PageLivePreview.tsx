'use client'

import { PageView } from '@/components/pages/PageView'
import type { PublicLocale } from '@/lib/publicLocale'
import type { Page } from '@/types/cms'

/**
 * Client wrapper for CMS live-style preview. Renders {@link PageView}.
 */
export function PageLivePreview({
  page,
  embedShortcodeVars,
  locale = 'de',
  trackingConsentGranted = true,
}: {
  page: Page
  embedShortcodeVars?: Record<string, string>
  locale?: PublicLocale
  trackingConsentGranted?: boolean
}) {
  return (
    <PageView
      page={page}
      embedShortcodeVars={embedShortcodeVars}
      locale={locale}
      trackingConsentGranted={trackingConsentGranted}
    />
  )
}
