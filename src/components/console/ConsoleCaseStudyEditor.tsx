'use client'

import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initial: {
    title: string
    slug: string
    summary: string | null
    industryId: number | null
    featuredImageId: number | null
    active: boolean
  }
  canEdit: boolean
}

export function ConsoleCaseStudyEditor({ id, initial, canEdit }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [summary, setSummary] = useState(initial.summary ?? '')
  const [industryId, setIndustryId] = useState(initial.industryId != null ? String(initial.industryId) : '')
  const [featuredImageId, setFeaturedImageId] = useState(initial.featuredImageId != null ? String(initial.featuredImageId) : '')
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const body: Record<string, unknown> = {
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim() || null,
      active,
    }
    const iid = industryId.trim()
    body.industryId = iid ? (Number.parseInt(iid, 10) || null) : null
    const fid = featuredImageId.trim()
    body.featuredImageId = fid ? (Number.parseInt(fid, 10) || null) : null

    setSaving(true)
    try {
      const res = await fetch(`/api/console/case-studies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string; caseStudy?: { updatedAt: string } }>(res)
      if (!res.ok) { setError(data?.error ?? 'Save failed'); return }
      setSuccess(`Saved at ${new Date(data?.caseStudy?.updatedAt ?? Date.now()).toLocaleString()}`)
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
      <label className="tma-console-label">Title <input type="text" className="tma-console-input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Slug <input type="text" className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Summary (optional) <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={dis} /></label>
      <label className="tma-console-label">Industry id (optional, <code>cms_industry.id</code>) <input type="text" className="tma-console-input" value={industryId} onChange={(e) => setIndustryId(e.target.value)} disabled={dis} placeholder="e.g. 1" /></label>
      <label className="tma-console-label">Featured image id (optional, <code>cms_media.id</code>) <input type="text" className="tma-console-input" value={featuredImageId} onChange={(e) => setFeaturedImageId(e.target.value)} disabled={dis} placeholder="e.g. 1" /></label>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={dis} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div> : null}
    </form>
  )
}
