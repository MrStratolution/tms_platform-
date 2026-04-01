'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    title: string
    description: string | null
    fileUrl: string
    fileLabel: string | null
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleDownloadAssetEditor({ id, initial, canEdit }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description ?? '')
  const [fileUrl, setFileUrl] = useState(initial.fileUrl)
  const [fileLabel, setFileLabel] = useState(initial.fileLabel ?? '')
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/console/download-assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          fileUrl: fileUrl.trim(),
          fileLabel: fileLabel.trim() || null,
          active,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        downloadAsset?: { updatedAt: string }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.downloadAsset?.updatedAt ?? Date.now()).toLocaleString()}`)
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}
      <label className="tma-console-label">
        Title
        <input
          type="text"
          className="tma-console-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Description
        <textarea
          className="tma-console-textarea-json"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        File URL
        <input
          type="text"
          className="tma-console-input"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          disabled={saving || readOnly}
          placeholder="/uploads/cms/… or https://…"
        />
      </label>
      <label className="tma-console-label">
        Link label
        <input
          type="text"
          className="tma-console-input"
          value={fileLabel}
          onChange={(e) => setFileLabel(e.target.value)}
          disabled={saving || readOnly}
          placeholder="Download PDF"
        />
      </label>
      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={saving || readOnly}
        />{' '}
        Active
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? (
        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
