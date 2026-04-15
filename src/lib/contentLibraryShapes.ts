type JsonRecord = Record<string, unknown>

export type ServiceProofBullet = {
  id?: string | null
  text: string
}

export type ServiceProof = {
  bullets?: ServiceProofBullet[] | null
  imageMediaId?: number | null
  imageUrl?: string | null
  imageAlt?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

export type IndustryMessaging = {
  positioning?: string | null
  challenges?: string[] | null
  opportunities?: string[] | null
  imageMediaId?: number | null
  imageUrl?: string | null
  imageAlt?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
}

export function normalizeServiceProof(value: unknown): ServiceProof {
  if (!isRecord(value)) return {}
  const bullets: ServiceProofBullet[] = Array.isArray(value.bullets)
    ? value.bullets.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.text !== 'string') return []
        const text = entry.text.trim()
        if (!text) return []
        return [
          {
            id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : null,
            text,
          },
        ]
      })
    : []

  return {
    bullets,
    imageMediaId: asOptionalNumber(value.imageMediaId),
    imageUrl: asOptionalString(value.imageUrl),
    imageAlt: asOptionalString(value.imageAlt),
    ctaLabel: asOptionalString(value.ctaLabel),
    ctaHref: asOptionalString(value.ctaHref),
  }
}

export function normalizeIndustryMessaging(value: unknown): IndustryMessaging {
  if (!isRecord(value)) return {}
  return {
    positioning: asOptionalString(value.positioning),
    challenges: asStringArray(value.challenges),
    opportunities: asStringArray(value.opportunities),
    imageMediaId: asOptionalNumber(value.imageMediaId),
    imageUrl: asOptionalString(value.imageUrl),
    imageAlt: asOptionalString(value.imageAlt),
    ctaLabel: asOptionalString(value.ctaLabel),
    ctaHref: asOptionalString(value.ctaHref),
  }
}
