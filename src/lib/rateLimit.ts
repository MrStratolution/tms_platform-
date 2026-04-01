import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const DEFAULT_MAX = 30
const DEFAULT_WINDOW_MS = 15 * 60 * 1000

function prune(now: number) {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

/** Upstash `Duration` template literal */
function windowStringFromMs(ms: number): `${number} s` | `${number} m` | `${number} h` {
  const sec = Math.max(1, Math.ceil(ms / 1000))
  if (sec <= 90) return `${sec} s` as `${number} s`
  const min = Math.max(1, Math.ceil(sec / 60))
  if (min < 120) return `${min} m` as `${number} m`
  const h = Math.max(1, Math.ceil(min / 60))
  return `${h} h` as `${number} h`
}

let upstashLimiter: Ratelimit | null | undefined

function getUpstashLimiter(
  max: number,
  windowMs: number,
): Ratelimit | null {
  if (upstashLimiter === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      upstashLimiter = null
      return null
    }
    const redis = new Redis({ url, token })
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, windowStringFromMs(windowMs)),
      prefix: 'tma:ratelimit',
    })
  }
  return upstashLimiter
}

/**
 * Sliding-window limiter. Uses **Upstash Redis** when `UPSTASH_REDIS_REST_URL`
 * and `UPSTASH_REDIS_REST_TOKEN` are set (safe for multi-instance / serverless).
 * Otherwise falls back to in-memory (single instance / dev).
 */
export async function checkRateLimit(
  key: string,
  max: number = Number(process.env.FORM_RATE_LIMIT_MAX) || DEFAULT_MAX,
  windowMs: number =
    Number(process.env.FORM_RATE_LIMIT_WINDOW_MS) || DEFAULT_WINDOW_MS,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const limiter = getUpstashLimiter(max, windowMs)
  if (limiter) {
    const { success, reset } = await limiter.limit(key)
    if (!success) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      }
    }
    return { ok: true }
  }

  const now = Date.now()
  prune(now)

  let b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }

  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }

  b.count += 1
  return { ok: true }
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}
