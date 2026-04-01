'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateFaqEntryForm() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!question.trim() || !answer.trim()) {
      setError('Question and answer are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/console/faq-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), answer: answer.trim() }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; faqEntry?: { id: number } }>(
        res,
      )
      if (!res.ok) {
        setError(data?.error ?? 'Create failed')
        return
      }
      if (data?.faqEntry?.id) {
        router.push(`/console/faq-entries/${data.faqEntry.id}`)
        router.refresh()
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">
        Question
        <input
          type="text"
          className="tma-console-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={saving}
        />
      </label>
      <label className="tma-console-label">
        Answer
        <textarea
          className="tma-console-textarea-json"
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={saving}
        />
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  )
}
