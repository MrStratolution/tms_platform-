import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function encryptionSecret(): string {
  const secret =
    process.env.SMTP_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    ''
  if (!secret) {
    throw new Error('SMTP_ENCRYPTION_KEY or ADMIN_SESSION_SECRET is required for SMTP password encryption')
  }
  return secret
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(encryptionSecret()).digest()
}

export function encryptSmtpPassword(value: string): string {
  const iv = randomBytes(12)
  const key = encryptionKey()
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.')
}

export function decryptSmtpPassword(value: string): string {
  const [ivPart, tagPart, encryptedPart] = value.split('.')
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted SMTP password payload')
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
