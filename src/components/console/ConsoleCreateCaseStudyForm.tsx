'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConsoleIndustrySelectField } from '@/components/console/ConsoleIndustrySelectField'
import { ConsoleMediaIdField } from '@/components/console/ConsoleMediaIdField'
import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateCaseStudyForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [industryId, setIndustryId] = useState<number | null>(null)
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null)
  const [active, setActive] = useState(true)
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
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          summary: summary.trim() || undefined,
          industryId,
          featuredImageId,
          active,
        }),
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
      <p className="tma-console-block-fields-hint">
        Active case studies can appear in automatic case-study sections such as the Work page.
      </p>
      <label className="tma-console-label">Title <input type="text" className="tma-console-input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Slug <input type="text" className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={saving} required /></label>
      <label className="tma-console-label">Summary (optional) <textarea className="tma-console-textarea-json" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={saving} /></label>
      <ConsoleIndustrySelectField
        label="Industry (optional)"
        value={industryId}
        onChange={setIndustryId}
        disabled={saving}
        helpText="Choose the market this case study belongs to. Leave empty if it should stay general."
      />
      <ConsoleMediaIdField
        label="Featured image"
        value={featuredImageId}
        onChange={setFeaturedImageId}
        disabled={saving}
        helpText="Used on case study cards and detail previews."
        folderSuggestion="case-studies"
        uploadLabel="Upload featured image"
        chooseLabel="Choose featured image"
      />
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} /> Active</label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></div>
    </form>
  )
}
