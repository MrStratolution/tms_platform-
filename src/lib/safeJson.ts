/**
 * Parse JSON from a fetch Response without throwing (empty body, HTML error pages, etc.).
 */
export async function readResponseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
