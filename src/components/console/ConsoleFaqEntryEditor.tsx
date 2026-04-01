'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    question: string
    answer: string
    sortOrder: number
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleFaqEntryEditor({ id, initial, canEdit }: Props) {
  const [question, setQuestion] = useState(initial.question)
  const [answer, setAnswer] = useState(initial.answer)
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder))
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)
    const so = Number.parseInt(sortOrder, 10)
    if (!Number.isFinite(so)) {
      setError('Sort order must be a number.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/console/faq-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          sortOrder: so,
          active,
        }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; faqEntry?: { updatedAt: string } }>(
        res,
      )
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.faqEntry?.updatedAt ?? Date.now()).toLocaleString()}`)
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
        Question
        <input
          type="text"
          className="tma-console-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Answer
        <textarea
          className="tma-console-textarea-json"
          rows={6}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={saving || readOnly}
        />
      </label>
      <label className="tma-console-label">
        Sort order (lower first in default admin list)
        <input
          type="text"
          className="tma-console-input"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          disabled={saving || readOnly}
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
