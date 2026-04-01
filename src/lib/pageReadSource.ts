/**
 * Public reads use Drizzle `tma_custom` tables (`cms_page`, …).
 */
export function getPageReadSource(): 'custom' {
  return 'custom'
}
