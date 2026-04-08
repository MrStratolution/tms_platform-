type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function mergeLocalizedValue(base: unknown, overlay: unknown): unknown {
  if (Array.isArray(overlay)) {
    return overlay
  }
  if (isRecord(base) && isRecord(overlay)) {
    const next: JsonRecord = { ...base }
    for (const [key, value] of Object.entries(overlay)) {
      next[key] = mergeLocalizedValue(base[key], value)
    }
    return next
  }
  return overlay
}

function pickLocaleOverlay(localizations: unknown, locale: string): JsonRecord | null {
  if (!isRecord(localizations)) return null
  const exact = localizations[locale]
  if (isRecord(exact)) return exact
  const short = locale.split('-')[0]?.toLowerCase()
  if (!short) return null
  const fallback = localizations[short]
  return isRecord(fallback) ? fallback : null
}

function cloneRecord<T extends JsonRecord>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function stripDocumentLocalizations<T extends JsonRecord>(document: T): T {
  const next = { ...document }
  delete (next as JsonRecord).localizations
  return next
}

/**
 * Resolve `{ localizations: { en: { ... } } }` style document overlays for public rendering.
 * Arrays replace the source array; nested objects merge recursively.
 */
export function resolveLocalizedDocument<T extends JsonRecord>(
  document: T,
  locale: string | null | undefined,
): T {
  const target = locale?.trim().toLowerCase()
  if (!target || target === 'de') return document
  const overlay = pickLocaleOverlay(document.localizations, target)
  if (!overlay) return document
  return mergeLocalizedValue(document, overlay) as T
}

export function getDocumentForLocaleEditor<T extends JsonRecord>(
  document: T,
  locale: string | null | undefined,
): T {
  const target = locale?.trim().toLowerCase()
  if (!target || target === 'de') return cloneRecord(document)
  return stripDocumentLocalizations(resolveLocalizedDocument(cloneRecord(document), target))
}

export function upsertDocumentLocale<T extends JsonRecord>(
  document: T,
  locale: string | null | undefined,
  localizedDocument: T,
): T {
  const target = locale?.trim().toLowerCase()
  const cleaned = stripDocumentLocalizations(cloneRecord(localizedDocument))

  if (!target || target === 'de') {
    const out = { ...cleaned } as JsonRecord
    if (isRecord(document.localizations)) {
      out.localizations = cloneRecord(document.localizations as JsonRecord)
    }
    return out as T
  }

  const out = cloneRecord(document) as JsonRecord
  const existing = isRecord(out.localizations) ? { ...(out.localizations as JsonRecord) } : {}
  existing[target] = cleaned
  out.localizations = existing
  return out as T
}
