import type { Page } from '@/types/cms'

/**
 * Clone a CMS `Page` for props from Server Components into the client preview (drops non-JSON values).
 * Lexical rich-text blocks are plain JSON editor state.
 */
export function serializePageForClient(page: Page): Page {
  return JSON.parse(JSON.stringify(page)) as Page
}
