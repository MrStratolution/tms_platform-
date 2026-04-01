'use client'

import { PageView } from '@/components/pages/PageView'
import type { Page } from '@/types/cms'

/**
 * Client wrapper for CMS live-style preview. Renders {@link PageView}.
 */
export function PageLivePreview({
  page,
  embedShortcodeVars,
}: {
  page: Page
  embedShortcodeVars?: Record<string, string>
}) {
  return <PageView page={page} embedShortcodeVars={embedShortcodeVars} />
}
