import { afterEach, describe, expect, it } from 'vitest'

import { decryptSmtpPassword, encryptSmtpPassword } from './passwordCrypto'

const previousSecret = process.env.SMTP_ENCRYPTION_KEY

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.SMTP_ENCRYPTION_KEY
  } else {
    process.env.SMTP_ENCRYPTION_KEY = previousSecret
  }
})

describe('passwordCrypto', () => {
  it('round-trips an encrypted SMTP password', () => {
    process.env.SMTP_ENCRYPTION_KEY = 'unit-test-secret'
    const encrypted = encryptSmtpPassword('super-secret-pass')
    expect(encrypted).not.toBe('super-secret-pass')
    expect(decryptSmtpPassword(encrypted)).toBe('super-secret-pass')
  })
})
