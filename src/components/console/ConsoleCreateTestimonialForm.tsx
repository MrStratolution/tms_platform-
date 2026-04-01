'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateTestimonialForm() {
  const router = useRouter()
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!quote.trim() || !author.trim()) {
      setError('Quote and author are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/console/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: quote.trim(), author: author.trim() }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; testimonial?: { id: number } }>(
        res,
      )
      if (!res.ok) {
        setError(data?.error ?? 'Create failed')
        return
      }
      if (data?.testimonial?.id) {
        router.push(`/console/testimonials/${data.testimonial.id}`)
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
        Quote
        <textarea
          className="tma-console-textarea-json"
          rows={4}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          disabled={saving}
        />
      </label>
      <label className="tma-console-label">
        Author
        <input
          type="text"
          className="tma-console-input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
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
