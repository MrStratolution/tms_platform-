'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    quote: string
    author: string
    role: string | null
    company: string | null
    photoMediaId: number | null
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleTestimonialEditor({ id, initial, canEdit }: Props) {
  const [quote, setQuote] = useState(initial.quote)
  const [author, setAuthor] = useState(initial.author)
  const [role, setRole] = useState(initial.role ?? '')
  const [company, setCompany] = useState(initial.company ?? '')
  const [photoMediaId, setPhotoMediaId] = useState(
    initial.photoMediaId != null ? String(initial.photoMediaId) : '',
  )
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)
    const pid = photoMediaId.trim()
    const body: Record<string, unknown> = {
      quote: quote.trim(),
      author: author.trim(),
      role: role.trim() || null,
      company: company.trim() || null,
      active,
    }
    if (pid === '') body.photoMediaId = null
    else {
      const n = Number.parseInt(pid, 10)
      if (!Number.isFinite(n) || n < 1) {
        setError('Photo media id must be a positive integer or empty.')
        return
      }
      body.photoMediaId = n
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; testimonial?: { updatedAt: string } }>(
        res,
      )
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.testimonial?.updatedAt ?? Date.now()).toLocaleString()}`)
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
        Quote
        <textarea
          className="tma-console-textarea-json"
          rows={5}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Author
        <input
          type="text"
          className="tma-console-input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Role (optional)
        <input
          type="text"
          className="tma-console-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Company (optional)
        <input
          type="text"
          className="tma-console-input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Photo media id (optional, <code>cms_media.id</code>)
        <input
          type="text"
          className="tma-console-input"
          value={photoMediaId}
          onChange={(e) => setPhotoMediaId(e.target.value)}
          disabled={saving || readOnly}
          placeholder="e.g. 1"
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
