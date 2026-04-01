import {
  CONSOLE_JWT_ISSUER,
  CONSOLE_SESSION_MAX_AGE_SEC,
} from '@/lib/console/constants'

const encoder = new TextEncoder()

export type ConsoleJwtPayload = {
  sub: string
  role: string
  email: string
  uiLocale: string
}

function requireSecret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be set and at least 32 characters')
  }
  return encoder.encode(s)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Copy into a dedicated `ArrayBuffer` for `crypto.subtle` typing. */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength)
  copy.set(view)
  return copy.buffer
}

async function importHmacKey(secretBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(secretBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signConsoleSessionToken(
  userId: string,
  email: string,
  role: string,
  uiLocale: string,
): Promise<string> {
  const secretBytes = requireSecret()
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: CONSOLE_JWT_ISSUER,
    sub: userId,
    email,
    role,
    uiLocale,
    iat: now,
    exp: now + CONSOLE_SESSION_MAX_AGE_SEC,
  }
  const encHeader = bytesToBase64Url(encoder.encode(JSON.stringify(header)))
  const encPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const data = encoder.encode(`${encHeader}.${encPayload}`)
  const key = await importHmacKey(secretBytes)
  const sig = await crypto.subtle.sign('HMAC', key, toArrayBuffer(data))
  const encSig = bytesToBase64Url(new Uint8Array(sig))
  return `${encHeader}.${encPayload}.${encSig}`
}

export async function verifyConsoleSessionToken(
  token: string,
): Promise<ConsoleJwtPayload | null> {
  try {
    const s = process.env.ADMIN_SESSION_SECRET
    if (!s || s.length < 32) return null
    const secretBytes = encoder.encode(s)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [h, p, sigB64] = parts
    if (!h || !p || !sigB64) return null
    const data = encoder.encode(`${h}.${p}`)
    const key = await importHmacKey(secretBytes)
    const sig = base64UrlToBytes(sigB64)
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      toArrayBuffer(sig),
      toArrayBuffer(data),
    )
    if (!ok) return null
    const payloadJson = new TextDecoder().decode(base64UrlToBytes(p))
    const payload = JSON.parse(payloadJson) as Record<string, unknown>
    if (payload.iss !== CONSOLE_JWT_ISSUER) return null
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null
    }
    const role = typeof payload.role === 'string' ? payload.role : 'admin'
    const exp = typeof payload.exp === 'number' ? payload.exp : 0
    if (exp * 1000 <= Date.now()) return null
    const uiLocale = typeof payload.uiLocale === 'string' ? payload.uiLocale : 'de'
    return { sub: payload.sub, email: payload.email, role, uiLocale }
  } catch {
    return null
  }
}
