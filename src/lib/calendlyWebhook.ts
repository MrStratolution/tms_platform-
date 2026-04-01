import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies Calendly `Calendly-Webhook-Signature` header: `t=<unix_ts>,v1=<hex>`.
 * Signed payload is `${t}.${rawBody}` (HMAC-SHA256 with the signing key).
 */
export function verifyCalendlySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string,
): boolean {
  if (!signatureHeader || !signingKey) return false

  let t = ''
  let v1 = ''
  for (const part of signatureHeader.split(',')) {
    const p = part.trim()
    if (p.startsWith('t=')) t = p.slice(2)
    else if (p.startsWith('v1=')) v1 = p.slice(3)
  }
  if (!t || !v1) return false

  const signedPayload = `${t}.${rawBody}`
  const expectedHex = createHmac('sha256', signingKey).update(signedPayload).digest('hex')

  let expectedBuf: Buffer
  let receivedBuf: Buffer
  try {
    expectedBuf = Buffer.from(expectedHex, 'hex')
    receivedBuf = Buffer.from(v1, 'hex')
  } catch {
    return false
  }

  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
