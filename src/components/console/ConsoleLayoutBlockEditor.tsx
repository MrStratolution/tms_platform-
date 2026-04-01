'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    name: string
    description: string | null
    block: Record<string, unknown>
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleLayoutBlockEditor({ id, initial, canEdit }: Props) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description ?? '')
  const [blockText, setBlockText] = useState(() => JSON.stringify(initial.block, null, 2))
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let block: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(blockText)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Block must be a JSON object.')
        return
      }
      block = parsed as Record<string, unknown>
    } catch {
      setError('Block is not valid JSON.')
      return
    }
    if (typeof block.blockType !== 'string') {
      setError('block.blockType is required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/layout-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          block,
          active,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        layoutBlock?: { updatedAt: string; block?: unknown }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      if (data?.layoutBlock?.block && typeof data.layoutBlock.block === 'object') {
        setBlockText(JSON.stringify(data.layoutBlock.block, null, 2))
      }
      setSuccess(`Saved at ${new Date(data?.layoutBlock?.updatedAt ?? Date.now()).toLocaleString()}`)
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
        Name
        <input
          type="text"
          className="tma-console-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Description
        <input
          type="text"
          className="tma-console-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Block JSON (one layout item)
        <textarea
          className="tma-console-textarea-json"
          value={blockText}
          onChange={(e) => setBlockText(e.target.value)}
          disabled={saving || readOnly}
          spellCheck={false}
          rows={16}
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
