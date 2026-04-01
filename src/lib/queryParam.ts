/** Next.js `searchParams` value (string or array for repeated keys). */
export function firstQueryParam(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  if (!sp) return undefined
  const v = sp[key]
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}
