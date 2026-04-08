'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

const PRESETS = {
  lead_admin_notification: {
    subject: 'Neuer Lead von {{name}}',
    htmlBody:
      '<div><p>Ein neuer Lead wurde erfasst.</p><ul><li>Name: {{name}}</li><li>E-Mail: {{email}}</li><li>Telefon: {{phone}}</li><li>Firma: {{company}}</li><li>Service: {{service}}</li><li>Nachricht: {{message}}</li><li>Seite: {{source_page}}</li></ul></div>',
    variablesJson: ['name', 'email', 'phone', 'company', 'service', 'message', 'source_page'],
  },
  lead_user_confirmation: {
    subject: 'Danke für Ihre Anfrage, {{name}}',
    htmlBody:
      '<div><p>Hallo {{name}},</p><p>vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und melden uns kurzfristig.</p><ul><li>E-Mail: {{email}}</li><li>Telefon: {{phone}}</li><li>Firma: {{company}}</li><li>Service: {{service}}</li><li>Seite: {{source_page}}</li></ul></div>',
    variablesJson: ['name', 'email', 'phone', 'company', 'service', 'message', 'source_page'],
  },
  'booking-cancellation': {
    subject: 'Termin abgesagt: {{bookingProfileName}} am {{scheduledFor}}',
    htmlBody:
      '<div><p>Hallo {{firstName}},</p><p>Ihr Termin wurde abgesagt.</p><ul><li>Profil: {{bookingProfileName}}</li><li>Termin: {{scheduledFor}}</li><li>Grund: {{reason}}</li></ul><p>Antworten Sie auf diese E-Mail, wenn Sie einen neuen Termin buchen möchten.</p></div>',
    variablesJson: ['firstName', 'bookingProfileName', 'scheduledFor', 'reason'],
  },
  generic: {
    subject: 'Neue Nachricht von TMA',
    htmlBody: '<div><p>Hallo {{name}},</p><p>Ihre Nachricht wird hier eingefügt.</p></div>',
    variablesJson: ['name'],
  },
} as const

type TemplateKey = keyof typeof PRESETS

export function ConsoleCreateEmailTemplateForm() {
  const router = useRouter()
  const [templateKey, setTemplateKey] = useState<TemplateKey>('lead_admin_notification')
  const [language, setLanguage] = useState<'de' | 'en'>('de')
  const [subject, setSubject] = useState<string>(PRESETS.lead_admin_notification.subject)
  const [htmlBody, setHtmlBody] = useState<string>(PRESETS.lead_admin_notification.htmlBody)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(nextKey: TemplateKey) {
    setTemplateKey(nextKey)
    setSubject(PRESETS[nextKey].subject)
    setHtmlBody(PRESETS[nextKey].htmlBody)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const preset = PRESETS[templateKey]
      const res = await fetch('/api/console/email-system/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: templateKey,
          language,
          subject,
          htmlBody,
          variablesJson: preset.variablesJson,
          active: true,
        }),
      })
      const data = await readResponseJson<{ error?: string; emailTemplate?: { id: number } }>(res)
      if (!res.ok || !data?.emailTemplate?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/email-system/templates/${data.emailTemplate.id}`)
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
        Create a bilingual transactional template. German is the default fallback language.
      </p>

      <div className="tma-console-field-row">
        <label className="tma-console-label">
          Template key
          <select
            className="tma-console-input"
            value={templateKey}
            onChange={(event) => applyPreset(event.target.value as TemplateKey)}
            disabled={busy}
          >
            <option value="lead_admin_notification">lead_admin_notification</option>
            <option value="lead_user_confirmation">lead_user_confirmation</option>
            <option value="booking-cancellation">booking-cancellation</option>
            <option value="generic">generic</option>
          </select>
        </label>
        <label className="tma-console-label">
          Language
          <select
            className="tma-console-input"
            value={language}
            onChange={(event) => setLanguage(event.target.value as 'de' | 'en')}
            disabled={busy}
          >
            <option value="de">German (DE)</option>
            <option value="en">English (EN)</option>
          </select>
        </label>
      </div>

      <label className="tma-console-label">
        Subject
        <input
          className="tma-console-input"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={busy}
        />
      </label>

      <label className="tma-console-label">
        HTML body
        <textarea
          className="tma-console-textarea-json"
          rows={16}
          value={htmlBody}
          onChange={(event) => setHtmlBody(event.target.value)}
          disabled={busy}
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
