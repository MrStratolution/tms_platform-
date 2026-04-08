'use client'

import Link from 'next/link'
import { useState } from 'react'

import { COOKIE_CONSENT_NAME, type CookieConsentValue } from '@/lib/cookieConsent'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'

type Props = {
  title: string
  body: string
  acceptLabel: string
  rejectLabel: string
  policyHref: string
  policyLabel: string
  locale?: PublicLocale
}

export function CookieConsentBanner(props: Props) {
  const [busy, setBusy] = useState<CookieConsentValue | null>(null)
  const localizedPolicyHref = localizePublicHref(props.policyHref, props.locale ?? 'de')

  function setConsent(value: CookieConsentValue) {
    setBusy(value)
    document.cookie = `${COOKIE_CONSENT_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax`
    window.location.reload()
  }

  return (
    <aside className="tma-cookie-banner" aria-live="polite" aria-label={props.title}>
      <div className="tma-cookie-banner__content">
        <h2 className="tma-cookie-banner__title">{props.title}</h2>
        <p className="tma-cookie-banner__body">{props.body}</p>
        <div className="tma-cookie-banner__actions">
          <button
            type="button"
            className="tma-cookie-banner__btn tma-cookie-banner__btn--secondary"
            onClick={() => setConsent('rejected')}
            disabled={busy !== null}
          >
            {props.rejectLabel}
          </button>
          <button
            type="button"
            className="tma-cookie-banner__btn tma-cookie-banner__btn--primary"
            onClick={() => setConsent('accepted')}
            disabled={busy !== null}
          >
            {props.acceptLabel}
          </button>
          <Link href={localizedPolicyHref} className="tma-cookie-banner__link">
            {props.policyLabel}
          </Link>
        </div>
      </div>
    </aside>
  )
}
