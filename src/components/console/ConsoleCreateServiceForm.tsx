'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateServiceForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [promise, setPromise] = useState('')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/console/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, summary: summary || null, promise: promise || null, proof: null, active }),
      })
      const data = await readResponseJson<{ error?: string; service?: { id: number } }>(res)
      if (!res.ok || !data?.service?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/services/${data.service.id}`)
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
        Start with the service name, promise, and summary. Proof bullets, supporting visuals, and
        CTA can be added on the next screen without editing raw JSON.
      </p>
      <label className="tma-console-label">Name <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} /></label>
      <label className="tma-console-label">Slug <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={busy} /></label>
      <label className="tma-console-label">Summary <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} /></label>
      <label className="tma-console-label">Promise <textarea className="tma-console-textarea-json" rows={4} value={promise} onChange={(e) => setPromise(e.target.value)} disabled={busy} /></label>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={busy} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={busy}>{busy ? 'Creating…' : 'Create service'}</button></div>
    </form>
  )
}
