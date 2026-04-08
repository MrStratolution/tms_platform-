type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export type DemoSeedMeta = {
  owner?: string
  demo?: boolean
  replaceBeforeProduction?: boolean
  kind?: string
  [key: string]: unknown
}

export function getDemoSeedMeta(document: unknown): DemoSeedMeta | null {
  if (!isRecord(document)) return null
  const meta = document.seedMeta
  if (!isRecord(meta)) return null
  return meta as DemoSeedMeta
}

export function isDemoContentDocument(document: unknown): boolean {
  const meta = getDemoSeedMeta(document)
  return Boolean(meta?.demo) || meta?.owner === 'cms-demo-seed'
}
