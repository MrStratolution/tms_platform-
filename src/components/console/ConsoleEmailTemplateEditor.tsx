'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  templateKey: string
  language: 'de' | 'en'
  initialSubject: string
  initialHtmlBody: string
  initialVariablesJson: string[]
  initialActive: boolean
  canEdit: boolean
}

export function ConsoleEmailTemplateEditor(props: Props) {
  const {
    id,
    templateKey,
    language,
    initialSubject,
    initialHtmlBody,
    initialVariablesJson,
    initialActive,
    canEdit,
  } = props

  const [subject, setSubject] = useState(initialSubject)
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody)
  const [active, setActive] = useState(initialActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/console/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          htmlBody,
          active,
        }),
      })
      const data = await readResponseJson<{
        error?: string
        emailTemplate?: { updatedAt?: string }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(
        `Saved at ${new Date(
          data?.emailTemplate?.updatedAt ?? Date.now(),
        ).toLocaleString()}`,
      )
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {!canEdit ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit templates.
        </p>
      ) : null}

      <div className="tma-console-field-row">
        <label className="tma-console-label">
          Template key
          <input className="tma-console-input" value={templateKey} disabled />
        </label>
        <label className="tma-console-label">
          Language
          <input className="tma-console-input" value={language.toUpperCase()} disabled />
        </label>
      </div>

      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          disabled={saving || !canEdit}
        />
        <span>Template is active</span>
      </label>

      <label className="tma-console-label">
        Subject
        <input
          className="tma-console-input"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={saving || !canEdit}
        />
      </label>

      <label className="tma-console-label">
        HTML body
        <textarea
          className="tma-console-textarea-json"
          rows={18}
          value={htmlBody}
          onChange={(event) => setHtmlBody(event.target.value)}
          disabled={saving || !canEdit}
          spellCheck={false}
        />
      </label>

      <fieldset className="tma-console-fieldset" disabled>
        <legend className="tma-console-subheading">Template variables</legend>
        {initialVariablesJson.length > 0 ? (
          <div className="tma-console-actions" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            {initialVariablesJson.map((token) => (
              <code key={token}>{`{{${token}}}`}</code>
            ))}
          </div>
        ) : (
          <p className="tma-console-note" style={{ marginBottom: 0 }}>
            No predefined variables.
          </p>
        )}
      </fieldset>

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={saving || !canEdit}>
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </div>
    </form>
  )
}
