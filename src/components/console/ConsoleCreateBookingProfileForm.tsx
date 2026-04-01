'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import {
  bookingProfileDocumentToRecord,
  defaultBookingProfileDocument,
  type BookingProfileDocument,
} from '@/lib/bookingProfileDocument'
import { readResponseJson } from '@/lib/safeJson'

const BOOKING_PRESETS: Array<{
  key: string
  label: string
  internalSlug: string
  build: () => BookingProfileDocument
}> = [
  {
    key: 'strategy',
    label: 'Strategy call',
    internalSlug: 'strategy-call',
    build: () => {
      const doc = defaultBookingProfileDocument({ name: 'Strategy call' })
      doc.helperText = 'Use this for qualified strategy conversations with prospects.'
      return doc
    },
  },
  {
    key: 'discovery',
    label: 'Discovery call',
    internalSlug: 'discovery-call',
    build: () => {
      const doc = defaultBookingProfileDocument({ name: 'Discovery call' })
      doc.durationMinutes = 45
      doc.helperText = 'A slightly longer first-call format for more context gathering.'
      return doc
    },
  },
  {
    key: 'audit',
    label: 'Audit review',
    internalSlug: 'audit-review',
    build: () => {
      const doc = defaultBookingProfileDocument({ name: 'Audit review' })
      doc.durationMinutes = 60
      doc.ctaLabel = 'Book audit review'
      doc.helperText = 'For walkthroughs tied to a completed audit or diagnostic.'
      return doc
    },
  },
  {
    key: 'external',
    label: 'External redirect profile',
    internalSlug: 'external-booking',
    build: () => {
      const doc = defaultBookingProfileDocument({ name: 'External booking' })
      doc.provider = 'calendly'
      doc.bookingUrl = 'https://calendly.com/your-team/intro-call'
      doc.ctaLabel = 'Open booking calendar'
      doc.helperText = 'Use this when scheduling is handled by an external provider.'
      return doc
    },
  },
]

export function ConsoleCreateBookingProfileForm() {
  const router = useRouter()
  const [presetKey, setPresetKey] = useState('strategy')
  const [name, setName] = useState('Strategy call')
  const [internalSlug, setInternalSlug] = useState('strategy-call')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPreset = useMemo(
    () => BOOKING_PRESETS.find((preset) => preset.key === presetKey) ?? BOOKING_PRESETS[0],
    [presetKey],
  )

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const nextDocument = selectedPreset.build()
      nextDocument.name = name.trim() || nextDocument.name
      const res = await fetch('/api/console/booking-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalSlug: internalSlug.trim() || null,
          active,
          document: bookingProfileDocumentToRecord(nextDocument),
        }),
      })
      const data = await readResponseJson<{ error?: string; bookingProfile?: { id: number } }>(res)
      if (!res.ok || !data?.bookingProfile?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/booking-profiles/${data.bookingProfile.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <p className="tma-console-lead">
        Start from a booking preset. After creation, you can adjust provider mode, working hours, buffers, CTA copy, and width in the guided editor.
      </p>
      <label className="tma-console-label">
        Starter preset
        <select
          className="tma-console-input"
          value={presetKey}
          onChange={(event) => {
            const nextPreset = BOOKING_PRESETS.find((preset) => preset.key === event.target.value)
            if (!nextPreset) return
            const built = nextPreset.build()
            setPresetKey(nextPreset.key)
            setName(built.name)
            setInternalSlug(nextPreset.internalSlug)
          }}
          disabled={busy}
        >
          {BOOKING_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Profile name
        <input
          className="tma-console-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        Internal slug (optional)
        <input
          className="tma-console-input"
          value={internalSlug}
          onChange={(event) => setInternalSlug(event.target.value)}
          disabled={busy}
          placeholder="e.g. strategy-call"
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          disabled={busy}
        />{' '}
        Active
      </label>
      <p className="tma-console-muted">
        Preset: <strong>{selectedPreset.label}</strong>.
      </p>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create booking profile'}
        </button>
      </div>
    </form>
  )
}
