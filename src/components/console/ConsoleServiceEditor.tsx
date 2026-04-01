'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    name: string
    slug: string
    summary: string | null
    promise: string | null
    proof: unknown
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleServiceEditor({ id, initial, canEdit }: Props) {
  const [name, setName] = useState(initial.name)
  const [slug, setSlug] = useState(initial.slug)
  const [summary, setSummary] = useState(initial.summary ?? '')
  const [promise, setPromise] = useState(initial.promise ?? '')
  const [proof, setProof] = useState(JSON.stringify(initial.proof ?? null, null, 2))
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let proofJson: unknown = null
    if (proof.trim()) {
      try {
        proofJson = JSON.parse(proof)
      } catch {
        setError('Proof must be valid JSON or empty.')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          summary: summary.trim() || null,
          promise: promise.trim() || null,
          proof: proofJson,
          active,
        }),
      })
      const data = await readResponseJson<{ error?: string; service?: { updatedAt: string } }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.service?.updatedAt ?? Date.now()).toLocaleString()}`)
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const dis = saving || !canEdit

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {!canEdit ? <p className="tma-console-env-warning" role="status"><strong>View only.</strong> Your role cannot edit content.</p> : null}
      <label className="tma-console-label">Name <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Slug <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Summary <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Promise <textarea className="tma-console-textarea-json" rows={4} value={promise} onChange={(e) => setPromise(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Proof JSON <textarea className="tma-console-textarea-json" rows={8} value={proof} onChange={(e) => setProof(e.target.value)} disabled={dis} spellCheck={false} /></label>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={dis} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div> : null}
    </form>
  )
}
