'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateCaseStudyForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !slug.trim()) { setError('Title and slug are required.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/console/case-studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim(), summary: summary.trim() || undefined }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; caseStudy?: { id: number } }>(res)
      if (!res.ok) { setError(data?.error ?? 'Create failed'); return }
      router.push(`/console/case-studies/${data?.caseStudy?.id}`)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">Title <input type="text" className="tma-console-input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Slug <input type="text" className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Summary (optional) <textarea className="tma-console-textarea-json" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={saving} /></label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></div>
    </form>
  )
}
