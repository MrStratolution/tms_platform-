'use client'

import { useState } from 'react'

import type { AdminUiLocale } from '@/lib/adminI18n'
import { readResponseJson } from '@/lib/safeJson'

type Props = {
  template: {
    id: number
    key: string
    language: 'de' | 'en'
    subject: string
    htmlBody: string
    variablesJson: string[]
    active: boolean
  }
  canEdit: boolean
  locale: AdminUiLocale
}

const COPY = {
  de: {
    active: 'Vorlage aktiv',
    variables: 'Verfuegbare Variablen',
    subject: 'Betreff',
    htmlBody: 'HTML-Body',
    save: 'Vorlage speichern',
    saving: 'Speichert...',
    success: 'Vorlage gespeichert.',
  },
  en: {
    active: 'Template active',
    variables: 'Available variables',
    subject: 'Subject',
    htmlBody: 'HTML body',
    save: 'Save template',
    saving: 'Saving...',
    success: 'Template saved.',
  },
} as const

export function ConsoleSystemEmailTemplateEditor(props: Props) {
  const copy = COPY[props.locale]
  const [subject, setSubject] = useState(props.template.subject)
  const [htmlBody, setHtmlBody] = useState(props.template.htmlBody)
  const [active, setActive] = useState(props.template.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!props.canEdit) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/console/email-system/templates/${props.template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody, active }),
      })
      const data = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(copy.success)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {!props.canEdit ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit email templates.
        </p>
      ) : null}
      <div className="tma-console-field-row">
        <label className="tma-console-label">
          {copy.subject}
          <input className="tma-console-input" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={saving || !props.canEdit} />
        </label>
        <label className="tma-console-label tma-console-label--inline" style={{ alignSelf: 'end' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving || !props.canEdit} />
          <span>{copy.active}</span>
        </label>
      </div>
      <label className="tma-console-label">
        {copy.htmlBody}
        <textarea className="tma-console-textarea-json" rows={18} value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} disabled={saving || !props.canEdit} />
      </label>
      <fieldset className="tma-console-fieldset" disabled>
        <legend className="tma-console-subheading">{copy.variables}</legend>
        <p className="tma-console-note" style={{ marginTop: 0 }}>
          {props.template.variablesJson.length > 0
            ? props.template.variablesJson.map((item) => `{{${item}}}`).join(', ')
            : '—'}
        </p>
      </fieldset>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={saving || !props.canEdit}>
          {saving ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  )
}
