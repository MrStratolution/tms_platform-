'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConsoleMediaIdField } from '@/components/console/ConsoleMediaIdField'
import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateTestimonialForm() {
  const router = useRouter()
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [photoMediaId, setPhotoMediaId] = useState<number | null>(null)
  const [logoMediaId, setLogoMediaId] = useState<number | null>(null)
  const [active, setActive] = useState(true)
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
        body: JSON.stringify({
          quote: quote.trim(),
          author: author.trim(),
          role: role.trim() || undefined,
          company: company.trim() || undefined,
          photoMediaId,
          logoMediaId,
          active,
        }),
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
      <p className="tma-console-block-fields-hint">
        Active testimonials can appear in spotlight and quote sections. Add a portrait or company
        logo only when it improves the quote visually.
      </p>
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
      <label className="tma-console-label">
        Role (optional)
        <input
          type="text"
          className="tma-console-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={saving}
        />
      </label>
      <label className="tma-console-label">
        Company (optional)
        <input
          type="text"
          className="tma-console-input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={saving}
        />
      </label>
      <ConsoleMediaIdField
        label="Portrait image"
        value={photoMediaId}
        onChange={setPhotoMediaId}
        disabled={saving}
        helpText="Optional portrait for spotlight and grid layouts."
        folderSuggestion="testimonials"
      />
      <ConsoleMediaIdField
        label="Company logo (optional)"
        value={logoMediaId}
        onChange={setLogoMediaId}
        disabled={saving}
        helpText="Optional logo for spotlight testimonial branding."
        folderSuggestion="logos"
        uploadLabel="Upload logo"
        chooseLabel="Choose logo"
      />
      <label className="tma-console-label tma-console-label--inline">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={saving}
        />{' '}
        Active
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
