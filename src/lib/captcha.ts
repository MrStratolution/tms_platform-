/**
 * Cloudflare Turnstile or hCaptcha when secrets are set.
 * Field names: `turnstileToken` (Turnstile) or `hcaptchaToken` (hCaptcha).
 */

async function verifyTurnstile(token: string, secret: string, remoteip?: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteip ? { remoteip } : {}),
  })
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as { success?: boolean }
  return Boolean(data.success)
}

async function verifyHcaptcha(token: string, secret: string, remoteip?: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteip ? { remoteip } : {}),
  })
  const res = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as { success?: boolean }
  return Boolean(data.success)
}

export type CaptchaInput = {
  turnstileToken?: string
  hcaptchaToken?: string
}

export async function verifyCaptchaIfConfigured(
  input: CaptchaInput,
  remoteip?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const turnSecret = process.env.TURNSTILE_SECRET_KEY
  const hSecret = process.env.HCAPTCHA_SECRET_KEY

  if (turnSecret) {
    const token = input.turnstileToken?.trim()
    if (!token) return { ok: false, error: 'Captcha required' }
    const ok = await verifyTurnstile(token, turnSecret, remoteip)
    return ok ? { ok: true } : { ok: false, error: 'Captcha verification failed' }
  }

  if (hSecret) {
    const token = input.hcaptchaToken?.trim()
    if (!token) return { ok: false, error: 'Captcha required' }
    const ok = await verifyHcaptcha(token, hSecret, remoteip)
    return ok ? { ok: true } : { ok: false, error: 'Captcha verification failed' }
  }

  return { ok: true }
}

export function captchaRequiredFromEnv(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY || process.env.HCAPTCHA_SECRET_KEY)
}
