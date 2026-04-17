'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  initialDisplayName: string | null
  initialWhatsappNumber: string | null
}

type MeResponse = {
  ok?: boolean
  user?: {
    displayName?: string | null
    whatsappNumber?: string | null
  }
  error?: string
}

export function ConsoleProfileSettingsForm(props: Props) {
  const [displayName, setDisplayName] = useState(props.initialDisplayName ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(props.initialWhatsappNumber ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/console-auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
        }),
      })
      const data = await readResponseJson<MeResponse>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Profile update failed')
        return
      }
      setDisplayName(data?.user?.displayName ?? '')
      setWhatsappNumber(data?.user?.whatsappNumber ?? '')
      setSuccess('Profile saved.')
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">
        Display name
        <input
          className="tma-console-input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={busy}
          placeholder="Shown in your console profile"
        />
      </label>
      <label className="tma-console-label">
        My WhatsApp number
        <input
          className="tma-console-input"
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          disabled={busy}
          placeholder="e.g. +49 171 5551234"
          inputMode="tel"
        />
      </label>
      <p className="tma-console-hint">
        Used by AI lead copilot for the <strong>Send to my WhatsApp</strong> action. This does not
        send messages automatically.
      </p>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
