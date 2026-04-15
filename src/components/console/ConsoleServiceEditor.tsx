'use client'

import { useState } from 'react'

import { ConsoleMediaIdField } from '@/components/console/ConsoleMediaIdField'
import { normalizeServiceProof } from '@/lib/contentLibraryShapes'
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
  const initialProof = normalizeServiceProof(initial.proof)
  const [name, setName] = useState(initial.name)
  const [slug, setSlug] = useState(initial.slug)
  const [summary, setSummary] = useState(initial.summary ?? '')
  const [promise, setPromise] = useState(initial.promise ?? '')
  const [bulletsText, setBulletsText] = useState(
    (initialProof.bullets ?? []).map((bullet) => bullet.text).join('\n'),
  )
  const [imageMediaId, setImageMediaId] = useState<number | null>(initialProof.imageMediaId ?? null)
  const [ctaLabel, setCtaLabel] = useState(initialProof.ctaLabel ?? '')
  const [ctaHref, setCtaHref] = useState(initialProof.ctaHref ?? '')
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const bullets = bulletsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }))

    const proofJson = {
      bullets,
      imageMediaId,
      ctaLabel: ctaLabel.trim() || null,
      ctaHref: ctaHref.trim() || null,
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
      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Basics</legend>
        <label className="tma-console-label">Name <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={dis} /></label>
        <label className="tma-console-label">Slug <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} /></label>
        <label className="tma-console-label">Summary <textarea className="tma-console-textarea-json" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={dis} /></label>
        <label className="tma-console-label">Promise <textarea className="tma-console-textarea-json" rows={4} value={promise} onChange={(e) => setPromise(e.target.value)} disabled={dis} /></label>
      </fieldset>
      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Proof and supporting content</legend>
        <label className="tma-console-label">
          Proof bullets (one per line)
          <textarea
            className="tma-console-textarea-json"
            rows={6}
            value={bulletsText}
            onChange={(e) => setBulletsText(e.target.value)}
            disabled={dis}
          />
        </label>
        <ConsoleMediaIdField
          label="Supporting image (optional)"
          value={imageMediaId}
          onChange={setImageMediaId}
          disabled={dis}
          helpText="Used when this service is mapped into a services section on a public page."
          folderSuggestion="services"
        />
        <div className="tma-console-field-row">
          <label className="tma-console-label">Proof CTA label (optional) <input className="tma-console-input" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} disabled={dis} /></label>
          <label className="tma-console-label">Proof CTA URL (optional) <input className="tma-console-input" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} disabled={dis} /></label>
        </div>
      </fieldset>
      <label className="tma-console-label tma-console-label--inline"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={dis} /> Active</label>
      <p className="tma-console-block-fields-hint">
        Active services can be surfaced automatically in library-backed services sections on CMS pages.
      </p>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      {canEdit ? <div className="tma-console-actions"><button type="submit" className="tma-console-submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div> : null}
    </form>
  )
}
