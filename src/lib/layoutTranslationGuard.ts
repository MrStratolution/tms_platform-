/** Ensure AI-translated layout matches source block structure before merge. */

export function validateTranslatedLayout(source: unknown, translated: unknown): unknown[] {
  if (!Array.isArray(source)) {
    throw new Error('Source layout is not an array')
  }
  if (!Array.isArray(translated)) {
    throw new Error('Translated layout is not an array')
  }
  if (source.length !== translated.length) {
    throw new Error(`Layout length mismatch: source ${source.length}, translated ${translated.length}`)
  }
  for (let i = 0; i < source.length; i++) {
    const a = source[i]
    const b = translated[i]
    const ta = a && typeof a === 'object' && !Array.isArray(a) ? (a as { blockType?: unknown }).blockType : null
    const tb = b && typeof b === 'object' && !Array.isArray(b) ? (b as { blockType?: unknown }).blockType : null
    if (ta !== tb) {
      throw new Error(`blockType mismatch at index ${i}: ${String(ta)} vs ${String(tb)}`)
    }
  }
  return translated
}
