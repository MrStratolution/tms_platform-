'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateIndustryForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/console/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, summary: summary || null, messaging: null, active }),
      })
      const data = await readResponseJson<{ error?: string; industry?: { id: number } }>(res)
      if (!res.ok || !data?.industry?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/industries/${data.industry.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <p className="tma-console-block-fields-hint">
        Start with the industry name and summary. Positioning, challenges, opportunities, and
        visuals can be added on the next screen through structured fields.
      </p>
      <label className="tma-console-label">Name <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} /></label>
      <label className="tma-console-label">Slug <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={busy} /></label>
      <label className="tma-console-label">Summary <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} /></label>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={busy} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={busy}>{busy ? 'Creating…' : 'Create industry'}</button></div>
    </form>
  )
}
