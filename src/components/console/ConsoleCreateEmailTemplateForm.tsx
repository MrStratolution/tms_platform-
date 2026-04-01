'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { EmailTemplateUseCase } from '@/lib/emailTemplateContent'
import { readResponseJson } from '@/lib/safeJson'

const USE_CASE_OPTIONS: Array<{
  value: EmailTemplateUseCase
  label: string
  defaultName: string
  defaultSlug: string
  defaultSubject: string
}> = [
  {
    value: 'generic',
    label: 'Generic message',
    defaultName: 'General email',
    defaultSlug: 'general-email',
    defaultSubject: 'A message from TMA',
  },
  {
    value: 'lead_thank_you',
    label: 'Lead thank-you',
    defaultName: 'Lead thank-you',
    defaultSlug: 'lead-thank-you',
    defaultSubject: 'Thanks for reaching out, {{firstName}}',
  },
  {
    value: 'booking_confirmation',
    label: 'Booking confirmation',
    defaultName: 'Booking confirmation',
    defaultSlug: 'booking-confirmation',
    defaultSubject: 'Your {{bookingProfileName}} is confirmed',
  },
  {
    value: 'booking_reminder',
    label: 'Booking reminder',
    defaultName: 'Booking reminder',
    defaultSlug: 'booking-reminder',
    defaultSubject: 'Reminder: your {{bookingProfileName}} is coming up',
  },
  {
    value: 'internal_lead_notification',
    label: 'Internal lead notification',
    defaultName: 'Internal lead notification',
    defaultSlug: 'internal-lead-notification',
    defaultSubject: 'New lead: {{email}}',
  },
  {
    value: 'internal_sync_alert',
    label: 'Internal sync alert',
    defaultName: 'Internal sync alert',
    defaultSlug: 'internal-sync-alert',
    defaultSubject: 'TMA sync alert',
  },
]

export function ConsoleCreateEmailTemplateForm() {
  const router = useRouter()
  const [useCase, setUseCase] = useState<EmailTemplateUseCase>('generic')
  const [name, setName] = useState('General email')
  const [slug, setSlug] = useState('general-email')
  const [subject, setSubject] = useState('A message from TMA')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPreset = useMemo(
    () => USE_CASE_OPTIONS.find((option) => option.value === useCase) ?? USE_CASE_OPTIONS[0],
    [useCase],
  )

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/console/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useCase,
          name: name.trim(),
          slug: slug.trim(),
          subject: subject.trim(),
        }),
      })
      const data = await readResponseJson<{ error?: string; emailTemplate?: { id: number } }>(res)
      if (!res.ok || !data?.emailTemplate?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/email-templates/${data.emailTemplate.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  function applyPreset(nextUseCase: EmailTemplateUseCase) {
    const preset = USE_CASE_OPTIONS.find((option) => option.value === nextUseCase)
    if (!preset) return
    setUseCase(nextUseCase)
    setName(preset.defaultName)
    setSlug(preset.defaultSlug)
    setSubject(preset.defaultSubject)
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <p className="tma-console-lead">
        Start from a structured email preset. You can refine the copy, CTA, preview, and advanced HTML after creation.
      </p>
      <label className="tma-console-label">
        Use case
        <select
          className="tma-console-input"
          value={useCase}
          onChange={(event) => applyPreset(event.target.value as EmailTemplateUseCase)}
          disabled={busy}
        >
          {USE_CASE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Display name
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
        Slug
        <input
          className="tma-console-input"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
          disabled={busy}
          autoComplete="off"
          placeholder={currentPreset.defaultSlug}
        />
      </label>
      <label className="tma-console-label">
        Subject
        <input
          className="tma-console-input"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create email template'}
        </button>
      </div>
    </form>
  )
}
