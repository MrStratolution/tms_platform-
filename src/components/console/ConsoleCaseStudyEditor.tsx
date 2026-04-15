'use client'

import { useState } from 'react'

import { ConsoleIndustrySelectField } from '@/components/console/ConsoleIndustrySelectField'
import { ConsoleMediaIdField } from '@/components/console/ConsoleMediaIdField'
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
  const [industryId, setIndustryId] = useState<number | null>(initial.industryId ?? null)
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(initial.featuredImageId ?? null)
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
    body.industryId = industryId
    body.featuredImageId = featuredImageId

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
      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Basics</legend>
        <label className="tma-console-label">Title <input type="text" className="tma-console-input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={dis} /></label>
        <label className="tma-console-label">Slug <input type="text" className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} /></label>
        <label className="tma-console-label">Summary (optional) <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={dis} /></label>
      </fieldset>
      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Public placement</legend>
        <ConsoleIndustrySelectField
          label="Industry (optional)"
          value={industryId}
          onChange={setIndustryId}
          disabled={dis}
          helpText="Choose the market this case study belongs to. Leave empty if it should stay general."
        />
        <ConsoleMediaIdField
          label="Featured image"
          value={featuredImageId}
          onChange={setFeaturedImageId}
          disabled={dis}
          helpText="Used on case study cards and detail previews."
          folderSuggestion="case-studies"
          uploadLabel="Upload featured image"
          chooseLabel="Choose featured image"
        />
      </fieldset>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={dis} /> Active</label>
      <p className="tma-console-block-fields-hint">
        Active case studies are visible in automatic case-study sections. Deactivate a row if it
        should stay in the library but not appear on live automatic grids.
      </p>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div> : null}
    </form>
  )
}
