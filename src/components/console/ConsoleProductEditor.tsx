'use client'

import { useCallback, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

const fieldClass = 'tma-console-input tma-console-input--compact'

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function asArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return []
  return v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[]
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asBool(v: unknown): boolean {
  return v === true
}

type Props = {
  id: number
  initialSlug: string
  initialName: string
  initialStatus: string
  initialDocument: Record<string, unknown>
  canEdit: boolean
}

export function ConsoleProductEditor({
  id,
  initialSlug,
  initialName,
  initialStatus,
  initialDocument,
  canEdit,
}: Props) {
  const [slug, setSlug] = useState(initialSlug)
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState(initialStatus === 'published' ? 'published' : 'draft')
  const [doc, setDoc] = useState<Record<string, unknown>>(() => ({ ...initialDocument }))
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState(() => JSON.stringify(initialDocument, null, 2))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const patch = useCallback((p: Record<string, unknown>) => {
    setDoc((prev) => ({ ...prev, ...p }))
  }, [])

  const patchNested = useCallback((key: string, p: Record<string, unknown>) => {
    setDoc((prev) => {
      const existing = (prev[key] && typeof prev[key] === 'object' && !Array.isArray(prev[key])) ? prev[key] as Record<string, unknown> : {}
      return { ...prev, [key]: { ...existing, ...p } }
    })
  }, [])

  function switchToRaw() {
    setRawText(JSON.stringify(doc, null, 2))
    setRawMode(true)
  }

  function switchToStructured() {
    try {
      const parsed: unknown = JSON.parse(rawText)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Document must be a JSON object.')
        return
      }
      setDoc(parsed as Record<string, unknown>)
      setRawMode(false)
      setError(null)
    } catch {
      setError('Document is not valid JSON. Fix it before switching.')
    }
  }

  function buildDocument(): Record<string, unknown> | null {
    if (rawMode) {
      try {
        const parsed: unknown = JSON.parse(rawText)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setError('Document must be a JSON object.')
          return null
        }
        return parsed as Record<string, unknown>
      } catch {
        setError('Document is not valid JSON.')
        return null
      }
    }
    return doc
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    const document = buildDocument()
    if (!document) return

    const nameTrim = name.trim()
    const slugTrim = slug.trim()
    if (!nameTrim || !slugTrim) {
      setError('Name and slug are required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/console/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameTrim, slug: slugTrim, status, document }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        product?: { updatedAt: string; document?: unknown; slug?: string; name?: string; status?: string }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      setSuccess(`Saved at ${new Date(data?.product?.updatedAt ?? Date.now()).toLocaleString()}`)
      const p = data?.product
      if (p?.document && typeof p.document === 'object') {
        const d = p.document as Record<string, unknown>
        setDoc(d)
        setRawText(JSON.stringify(d, null, 2))
      }
      if (typeof p?.slug === 'string') setSlug(p.slug)
      if (typeof p?.name === 'string') setName(p.name)
      if (typeof p?.status === 'string') setStatus(p.status === 'published' ? 'published' : 'draft')
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit
  const dis = saving || readOnly

  const modules = asArr(doc.modules)
  const faqs = asArr(doc.faqs)
  const pricing = (doc.pricing && typeof doc.pricing === 'object' && !Array.isArray(doc.pricing)) ? doc.pricing as Record<string, unknown> : null
  const plans = pricing ? asArr(pricing.plans) : []
  const primaryCta = (doc.primaryCta && typeof doc.primaryCta === 'object' && !Array.isArray(doc.primaryCta)) ? doc.primaryCta as Record<string, unknown> : {}
  const seo = (doc.seo && typeof doc.seo === 'object' && !Array.isArray(doc.seo)) ? doc.seo as Record<string, unknown> : {}
  const toggles = (doc.toggles && typeof doc.toggles === 'object' && !Array.isArray(doc.toggles)) ? doc.toggles as Record<string, unknown> : {}

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}

      <p className="tma-console-lead">
        Public page at <code>/products/{slug || '[slug]'}</code>. Slug must stay URL-safe (lowercase, hyphens).
      </p>

      <fieldset className="tma-console-fieldset">
        <legend className="tma-console-subheading">Product basics</legend>
        <label className="tma-console-label">
          Name
          <input className="tma-console-input" value={name} onChange={(e) => setName(e.target.value)} disabled={dis} autoComplete="off" />
        </label>
        <label className="tma-console-label">
          Slug
          <input className="tma-console-input" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={dis} autoComplete="off" />
        </label>
        <label className="tma-console-label">
          Status
          <select className="tma-console-input" value={status} onChange={(e) => setStatus(e.target.value === 'published' ? 'published' : 'draft')} disabled={dis}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
      </fieldset>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <button
          type="button"
          className={rawMode ? 'tma-console-btn-secondary' : 'tma-console-submit'}
          onClick={() => { if (rawMode) switchToStructured() }}
          disabled={!rawMode}
        >
          Structured editor
        </button>
        <button
          type="button"
          className={rawMode ? 'tma-console-submit' : 'tma-console-btn-secondary'}
          onClick={() => { if (!rawMode) switchToRaw() }}
          disabled={rawMode}
        >
          Raw JSON
        </button>
      </div>

      {rawMode ? (
        <label className="tma-console-label">
          Document (JSON)
          <textarea
            className="tma-console-textarea-json"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={dis}
            spellCheck={false}
          />
        </label>
      ) : (
        <>
          {/* Hero / tagline */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Hero &amp; tagline</legend>
            <label className="tma-console-label">
              Tagline
              <input className={fieldClass} value={asStr(doc.tagline)} onChange={(e) => patch({ tagline: e.target.value })} disabled={dis} placeholder="Short value proposition" />
            </label>
            <div className="tma-console-field-row">
              <label className="tma-console-label">
                Primary CTA label
                <input className={fieldClass} value={asStr(primaryCta.label)} onChange={(e) => patchNested('primaryCta', { label: e.target.value })} disabled={dis} />
              </label>
              <label className="tma-console-label">
                Primary CTA URL
                <input className={fieldClass} value={asStr(primaryCta.href)} onChange={(e) => patchNested('primaryCta', { href: e.target.value })} disabled={dis} />
              </label>
            </div>
          </fieldset>

          {/* Modules / benefits */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Modules / benefits</legend>
            <p className="tma-console-block-fields-hint">What the product includes or key benefits. Renders as a feature list on the public page.</p>
            {modules.map((m, i) => (
              <div key={asStr(m.id, `mod-${i}`)} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Module {i + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ modules: modules.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Title
                  <input className={fieldClass} value={asStr(m.title)} onChange={(e) => { const next = [...modules]; next[i] = { ...m, title: e.target.value }; patch({ modules: next }) }} disabled={dis} />
                </label>
                <label className="tma-console-label">
                  Body
                  <textarea className={fieldClass} rows={2} value={asStr(m.body)} onChange={(e) => { const next = [...modules]; next[i] = { ...m, body: e.target.value }; patch({ modules: next }) }} disabled={dis} />
                </label>
              </div>
            ))}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ modules: [...modules, { id: newId(), title: 'New module', body: '' }] })} disabled={dis}>Add module</button>
          </fieldset>

          {/* Deliverables */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Deliverables</legend>
            <p className="tma-console-block-fields-hint">Concrete deliverables the client receives.</p>
            {asArr(doc.deliverables).map((d, i) => {
              const deliverables = asArr(doc.deliverables)
              return (
                <div key={asStr(d.id, `del-${i}`)} className="tma-console-nested-block">
                  <div className="tma-console-nested-block__head">
                    <span className="tma-console-nested-block__title">Deliverable {i + 1}</span>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ deliverables: deliverables.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                  </div>
                  <label className="tma-console-label">
                    Title
                    <input className={fieldClass} value={asStr(d.title)} onChange={(e) => { const next = [...deliverables]; next[i] = { ...d, title: e.target.value }; patch({ deliverables: next }) }} disabled={dis} />
                  </label>
                  <label className="tma-console-label">
                    Description
                    <textarea className={fieldClass} rows={2} value={asStr(d.description)} onChange={(e) => { const next = [...deliverables]; next[i] = { ...d, description: e.target.value }; patch({ deliverables: next }) }} disabled={dis} />
                  </label>
                </div>
              )
            })}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ deliverables: [...asArr(doc.deliverables), { id: newId(), title: '', description: '' }] })} disabled={dis}>Add deliverable</button>
          </fieldset>

          {/* Pricing */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Pricing</legend>
            <label className="tma-console-label">
              Section title
              <input className={fieldClass} value={asStr(pricing?.sectionTitle)} onChange={(e) => patchNested('pricing', { sectionTitle: e.target.value })} disabled={dis} />
            </label>
            <label className="tma-console-label">
              Intro
              <textarea className={fieldClass} rows={2} value={asStr(pricing?.intro)} onChange={(e) => patchNested('pricing', { intro: e.target.value })} disabled={dis} />
            </label>
            {plans.map((plan, i) => {
              const bullets = asArr(plan.bullets)
              const updatePlan = (p: Record<string, unknown>) => {
                const next = [...plans]
                next[i] = { ...plan, ...p }
                patchNested('pricing', { plans: next })
              }
              return (
                <div key={asStr(plan.id, `plan-${i}`)} className="tma-console-nested-block">
                  <div className="tma-console-nested-block__head">
                    <span className="tma-console-nested-block__title">Plan {i + 1}</span>
                    <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patchNested('pricing', { plans: plans.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                  </div>
                  <label className="tma-console-label">
                    Name
                    <input className={fieldClass} value={asStr(plan.name)} onChange={(e) => updatePlan({ name: e.target.value })} disabled={dis} />
                  </label>
                  <div className="tma-console-field-row">
                    <label className="tma-console-label">
                      Price
                      <input className={fieldClass} value={asStr(plan.price)} onChange={(e) => updatePlan({ price: e.target.value })} disabled={dis} />
                    </label>
                    <label className="tma-console-label">
                      Cadence
                      <select className={fieldClass} value={asStr(plan.cadence, 'custom')} onChange={(e) => updatePlan({ cadence: e.target.value })} disabled={dis}>
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                        <option value="once">One-time</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                  </div>
                  <label className="tma-console-label">
                    Description
                    <textarea className={fieldClass} rows={2} value={asStr(plan.description)} onChange={(e) => updatePlan({ description: e.target.value })} disabled={dis} />
                  </label>
                  <label className="tma-console-label">
                    Bullets (one per line)
                    <textarea
                      className={fieldClass}
                      rows={3}
                      value={bullets.map((b) => asStr(b.text)).join('\n')}
                      onChange={(e) => updatePlan({ bullets: e.target.value.split('\n').map((text) => ({ text, id: newId() })) })}
                      disabled={dis}
                    />
                  </label>
                  <div className="tma-console-field-row">
                    <label className="tma-console-label">
                      CTA label
                      <input className={fieldClass} value={asStr(plan.ctaLabel)} onChange={(e) => updatePlan({ ctaLabel: e.target.value })} disabled={dis} />
                    </label>
                    <label className="tma-console-label">
                      CTA URL
                      <input className={fieldClass} value={asStr(plan.ctaHref)} onChange={(e) => updatePlan({ ctaHref: e.target.value })} disabled={dis} />
                    </label>
                  </div>
                </div>
              )
            })}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patchNested('pricing', { plans: [...plans, { id: newId(), name: 'New plan', price: '$0', cadence: 'monthly', description: '', bullets: [], ctaLabel: '', ctaHref: '' }] })} disabled={dis}>Add plan</button>
          </fieldset>

          {/* FAQs */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">FAQs</legend>
            {faqs.map((faq, i) => (
              <div key={asStr(faq.id, `faq-${i}`)} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">FAQ {i + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => patch({ faqs: faqs.filter((_, j) => j !== i) })} disabled={dis}>Remove</button>
                </div>
                <label className="tma-console-label">
                  Question
                  <input className={fieldClass} value={asStr(faq.question)} onChange={(e) => { const next = [...faqs]; next[i] = { ...faq, question: e.target.value }; patch({ faqs: next }) }} disabled={dis} />
                </label>
                <label className="tma-console-label">
                  Answer
                  <textarea className={fieldClass} rows={3} value={asStr(faq.answer)} onChange={(e) => { const next = [...faqs]; next[i] = { ...faq, answer: e.target.value }; patch({ faqs: next }) }} disabled={dis} />
                </label>
              </div>
            ))}
            <button type="button" className="tma-console-btn-secondary" onClick={() => patch({ faqs: [...faqs, { id: newId(), question: '', answer: '' }] })} disabled={dis}>Add FAQ</button>
          </fieldset>

          {/* SEO */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">SEO overrides</legend>
            <label className="tma-console-label">
              Meta title
              <input className={fieldClass} value={asStr(seo.title)} onChange={(e) => patchNested('seo', { title: e.target.value })} disabled={dis} placeholder="Falls back to product name" />
            </label>
            <label className="tma-console-label">
              Meta description
              <textarea className={fieldClass} rows={2} value={asStr(seo.description)} onChange={(e) => patchNested('seo', { description: e.target.value })} disabled={dis} />
            </label>
          </fieldset>

          {/* Toggles */}
          <fieldset className="tma-console-fieldset">
            <legend className="tma-console-subheading">Page toggles</legend>
            <p className="tma-console-block-fields-hint">Control which sections appear on the public product page.</p>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showBookingCta)} onChange={(e) => patchNested('toggles', { showBookingCta: e.target.checked })} disabled={dis} />
              Show booking CTA
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showLeadForm)} onChange={(e) => patchNested('toggles', { showLeadForm: e.target.checked })} disabled={dis} />
              Show lead capture form
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showStickyCta)} onChange={(e) => patchNested('toggles', { showStickyCta: e.target.checked })} disabled={dis} />
              Show sticky CTA bar
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showComparison)} onChange={(e) => patchNested('toggles', { showComparison: e.target.checked })} disabled={dis} />
              Show comparison table
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showTimeline)} onChange={(e) => patchNested('toggles', { showTimeline: e.target.checked })} disabled={dis} />
              Show process / timeline
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showTestimonials)} onChange={(e) => patchNested('toggles', { showTestimonials: e.target.checked })} disabled={dis} />
              Show testimonials
            </label>
            <label className="tma-console-label tma-console-label--inline" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={asBool(toggles.showDownloads)} onChange={(e) => patchNested('toggles', { showDownloads: e.target.checked })} disabled={dis} />
              Show downloads / resources
            </label>
          </fieldset>
        </>
      )}

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      {canEdit ? (
        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
