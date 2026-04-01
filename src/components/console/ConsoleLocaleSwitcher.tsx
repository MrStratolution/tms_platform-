'use client'

import { useState } from 'react'

import { adminCopy, normalizeAdminUiLocale } from '@/lib/adminI18n'
import { readResponseJson } from '@/lib/safeJson'

export function ConsoleLocaleSwitcher(props: {
  initialLocale: string
}) {
  const [locale, setLocale] = useState(normalizeAdminUiLocale(props.initialLocale))
  const [busy, setBusy] = useState(false)

  async function onChange(next: 'de' | 'en') {
    setLocale(next)
    setBusy(true)
    try {
      const res = await fetch('/api/console-auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiLocale: next }),
      })
      if (!res.ok) {
        await readResponseJson(res)
        setLocale(normalizeAdminUiLocale(props.initialLocale))
        return
      }
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="tma-cms-topbar-user" style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
      <span>{adminCopy(locale, 'language')}</span>
      <select
        className="tma-console-input"
        value={locale}
        onChange={(e) => void onChange(normalizeAdminUiLocale(e.target.value))}
        disabled={busy}
        style={{ width: '6rem', minWidth: '6rem', padding: '0.35rem 0.55rem' }}
      >
        <option value="de">DE</option>
        <option value="en">EN</option>
      </select>
    </label>
  )
}
