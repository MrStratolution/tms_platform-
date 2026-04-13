'use client'

import { useEffect, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'
import { PRODUCT_CONTENT_KIND_VALUES, type ProductContentKind } from '@/types/cms'

const selectClass = 'tma-console-input tma-console-input--compact'

export function TestimonialSliderPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const raw = Array.isArray(o.testimonials) ? o.testimonials : []
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))

  const [rows, setRows] = useState<{
    id: number
    author: string
    company?: string | null
    quote: string
    active: boolean
    hasPhoto?: boolean
    hasLogo?: boolean
  }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const layoutPreset = o.layoutPreset === 'grid' ? 'grid' : 'spotlight'
  const showPortraits = o.showPortraits !== false
  const showLogos = o.showLogos !== false

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/testimonials', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          testimonials?: {
            id: number
            author: string
            company?: string | null
            quote: string
            active: boolean
            hasPhoto?: boolean
            hasLogo?: boolean
          }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load testimonials')
          return
        }
        setRows(data?.testimonials ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addId = (id: number) => {
    if (ids.includes(id)) return
    set({ testimonials: [...ids, id] })
  }

  const removeAt = (idx: number) => {
    set({ testimonials: ids.filter((_, i) => i !== idx) })
  }

  return (
    <div className="tma-console-block-fields">
      <label className="tma-console-label">
        Layout
        <select
          className={selectClass}
          value={layoutPreset}
          onChange={(e) => set({ layoutPreset: e.target.value })}
          disabled={disabled}
        >
          <option value="spotlight">Scrolling cards</option>
          <option value="grid">Simple grid</option>
        </select>
      </label>
      <label className="tma-console-label">
        Section intro (optional)
        <textarea
          className={selectClass}
          rows={2}
          value={String(o.sectionIntro ?? '')}
          onChange={(e) => set({ sectionIntro: e.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="tma-console-label" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={showPortraits}
          onChange={(e) => set({ showPortraits: e.target.checked })}
          disabled={disabled}
        />
        Show testimonial portraits when available
      </label>
      <label className="tma-console-label" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={showLogos}
          onChange={(e) => set({ showLogos: e.target.checked })}
          disabled={disabled}
        />
        Show company logos or names when available
      </label>
      <p className="tma-console-block-fields-hint">
        Choose saved rows from <strong>Libraries → Testimonials</strong>. Order matches the public
        layout. Use <strong>Scrolling cards</strong> for the cleaner horizontal section style.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      {ids.length === 0 ? (
        <p className="tma-console-lead">No testimonials selected yet.</p>
      ) : (
        <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
          {ids.map((id, idx) => {
            const meta = rows.find((r) => r.id === id)
            return (
              <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                <strong>{meta?.author ?? `Testimonial #${id}`}</strong>
                {meta?.company?.trim() ? ` — ${meta.company.trim()}` : ''}
                {meta?.hasLogo ? ' · logo' : ''}
                {meta?.hasPhoto ? ' · portrait' : ''}
                {!meta?.active ? ' (inactive)' : ''}
                {meta ? (
                  <a
                    href={`/console/testimonials/${id}`}
                    style={{ marginLeft: '0.5rem', color: 'var(--tma-lime)' }}
                  >
                    Edit
                  </a>
                ) : null}
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => removeAt(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <label className="tma-console-label">
        Add testimonial
        <select
          className={selectClass}
          value=""
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10)
            e.target.value = ''
            if (Number.isFinite(v) && v > 0) addId(v)
          }}
          disabled={disabled || rows.length === 0}
        >
          <option value="">Choose…</option>
          {rows.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.author.slice(0, 48)}
              {r.company?.trim() ? ` — ${r.company.trim().slice(0, 36)}` : ''}
              {r.hasLogo ? ' · logo' : ''}
              {r.hasPhoto ? ' · portrait' : ''}
              {!r.active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function FaqLibraryPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const ids = Array.isArray(o.faqEntryIds)
    ? o.faqEntryIds.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    : []

  const [rows, setRows] = useState<{ id: number; question: string; active: boolean }[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/faq-entries', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          faqEntries?: { id: number; question: string; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load FAQ entries')
          return
        }
        setRows(data?.faqEntries ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addId = (id: number) => {
    if (ids.includes(id)) return
    set({ faqEntryIds: [...ids, id] })
  }

  const removeAt = (idx: number) => {
    set({ faqEntryIds: ids.filter((_, i) => i !== idx) })
  }

  const useLibrary = ids.length > 0

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        When you choose FAQ entries below, the public page uses those saved rows in this order.
        Clear the list to manage questions directly inside this section.
      </p>
      {useLibrary ? (
        <p className="tma-console-env-warning" role="status">
          Library mode active ({ids.length} entr{ids.length === 1 ? 'y' : 'ies'}).
        </p>
      ) : null}
      {err ? <p className="tma-console-error">{err}</p> : null}
      {ids.length > 0 ? (
        <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
          {ids.map((id, idx) => {
            const meta = rows.find((r) => r.id === id)
            return (
              <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                <strong>#{id}</strong>
                {meta ? ` — ${meta.question.slice(0, 70)}` : ''}
                {!meta?.active ? ' (inactive)' : ''}
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => removeAt(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
      <label className="tma-console-label">
        Add FAQ entry
        <select
          className={selectClass}
          value=""
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10)
            e.target.value = ''
            if (Number.isFinite(v) && v > 0) addId(v)
          }}
          disabled={disabled || rows.length === 0}
        >
          <option value="">Choose…</option>
          {rows.map((r) => (
            <option key={r.id} value={String(r.id)}>
              #{r.id} — {r.question.slice(0, 60)}
              {!r.active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </label>
      {ids.length > 0 ? (
        <button
          type="button"
          className="tma-console-btn-secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={() => set({ faqEntryIds: [] })}
          disabled={disabled}
        >
          Clear selected FAQ entries
        </button>
      ) : null}
    </div>
  )
}

export function DownloadAssetPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const current =
    typeof o.downloadAssetId === 'number' && Number.isFinite(o.downloadAssetId)
      ? o.downloadAssetId
      : ''

  const [rows, setRows] = useState<{ id: number; title: string; active: boolean }[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/download-assets', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          downloadAssets?: { id: number; title: string; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load downloads')
          return
        }
        setRows(data?.downloadAssets ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Optional: attach a row from <strong>Downloads</strong>. When set, the public page uses the
        library file URL and labels; you can still override styling fields below for drafts.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <label className="tma-console-label">
        Library asset
        <select
          className={selectClass}
          value={current === '' ? '' : String(current)}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') {
              set({ downloadAssetId: undefined })
              return
            }
            set({ downloadAssetId: Number.parseInt(v, 10) })
          }}
          disabled={disabled}
        >
          <option value="">None — use manual fields only</option>
          {rows.map((r) => (
            <option key={r.id} value={String(r.id)}>
              #{r.id} — {r.title}
              {!r.active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function CaseStudyGridPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const raw = Array.isArray(o.studies) ? o.studies : []
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  const selectionMode =
    o.selectionMode === 'manual' || o.selectionMode === 'automatic'
      ? o.selectionMode
      : ids.length > 0
        ? 'manual'
        : 'automatic'

  const [rows, setRows] = useState<
    { id: number; title: string; slug: string; active: boolean }[]
  >([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/case-studies', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          caseStudies?: { id: number; title: string; slug: string; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load case studies')
          return
        }
        setRows(data?.caseStudies ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addId = (id: number) => {
    if (ids.includes(id)) return
    set({ studies: [...ids, id] })
  }

  const removeAt = (idx: number) => {
    set({ studies: ids.filter((_, i) => i !== idx) })
  }

  const inactiveSelectedIds = ids.filter((id) => {
    const meta = rows.find((row) => row.id === id)
    return meta != null && meta.active === false
  })
  const missingSelectedIds = ids.filter((id) => !rows.some((row) => row.id === id))
  const staleSelectedIds = [...inactiveSelectedIds, ...missingSelectedIds]

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Choose whether this section is manually curated or automatically filled from
        <strong> Libraries → Case Studies</strong>.
      </p>
      <label className="tma-console-label">
        Selection mode
        <select
          className={selectClass}
          value={selectionMode}
          onChange={(e) =>
            set(
              e.target.value === 'automatic'
                ? { selectionMode: 'automatic', studies: [] }
                : { selectionMode: 'manual' },
            )
          }
          disabled={disabled}
        >
          <option value="manual">Manual selection</option>
          <option value="automatic">All active case studies</option>
        </select>
      </label>
      {err ? <p className="tma-console-error">{err}</p> : null}
      {selectionMode === 'manual' ? (
        <>
          <p className="tma-console-block-fields-hint">
            This section is <strong>curated manually</strong>. Only the selected case studies below
            will show live, in this exact order. Changes in the case-study library will not show
            here until you update the selection or switch this block to automatic mode.
          </p>
          {staleSelectedIds.length > 0 ? (
            <>
              <p className="tma-console-error" style={{ marginBottom: '0.5rem' }}>
                {inactiveSelectedIds.length > 0
                  ? `${inactiveSelectedIds.length} selected case stud${inactiveSelectedIds.length === 1 ? 'y is' : 'ies are'} inactive`
                  : null}
                {inactiveSelectedIds.length > 0 && missingSelectedIds.length > 0 ? '; ' : null}
                {missingSelectedIds.length > 0
                  ? `${missingSelectedIds.length} selected item${missingSelectedIds.length === 1 ? ' no longer exists' : 's no longer exist'}`
                  : null}
                . Clean these up so the live section matches the editor.
              </p>
              <p className="tma-console-actions" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="tma-console-btn-secondary"
                  onClick={() =>
                    set({
                      studies: ids.filter((id) => !staleSelectedIds.includes(id)),
                    })
                  }
                  disabled={disabled}
                >
                  Remove inactive / missing selections
                </button>
              </p>
            </>
          ) : null}
          <p className="tma-console-actions" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="tma-console-btn-secondary"
              onClick={() => set({ selectionMode: 'automatic', studies: [] })}
              disabled={disabled}
            >
              Use all active case studies instead
            </button>
          </p>
          {ids.length === 0 ? (
            <p className="tma-console-lead">No case studies selected yet.</p>
          ) : (
            <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
              {ids.map((id, idx) => {
                const meta = rows.find((r) => r.id === id)
                return (
                  <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                    <strong>#{id}</strong>
                    {meta ? ` — ${meta.title}` : ''}
                    {!meta?.active ? ' (inactive)' : ''}
                    <button
                      type="button"
                      className="tma-console-btn-danger tma-console-btn-danger--small"
                      style={{ marginLeft: '0.5rem' }}
                      onClick={() => removeAt(idx)}
                      disabled={disabled}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          <label className="tma-console-label">
            Add case study
            <select
              className={selectClass}
              value=""
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10)
                e.target.value = ''
                if (Number.isFinite(v) && v > 0) addId(v)
              }}
              disabled={disabled || rows.length === 0}
            >
              <option value="">Choose…</option>
              {rows.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  #{r.id} — {r.title}
                  {!r.active ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <p className="tma-console-block-fields-hint">
            This section is <strong>automatic</strong> and will show all <strong>active</strong>
            case studies from <strong>Libraries → Case Studies</strong>, newest first.
            Deactivate any row there to remove it from live automatic sections.
          </p>
          <p className="tma-console-block-fields-hint">
            The manual list is cleared automatically in this mode so the live result matches the
            library cleanly.
          </p>
        </>
      )}
    </div>
  )
}

export function FeaturedProjectSpotlightPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const currentId =
    typeof o.caseStudyId === 'number'
      ? o.caseStudyId
      : o.caseStudyId && typeof o.caseStudyId === 'object' && 'id' in o.caseStudyId && typeof o.caseStudyId.id === 'number'
        ? o.caseStudyId.id
        : ''

  const [rows, setRows] = useState<
    { id: number; title: string; slug: string; active: boolean }[]
  >([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/case-studies', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          caseStudies?: { id: number; title: string; slug: string; active: boolean }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load case studies')
          return
        }
        setRows(data?.caseStudies ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selected =
    currentId !== '' ? rows.find((row) => row.id === currentId) ?? null : null

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Optionally link one saved row from <strong>Libraries → Case Studies</strong>. When linked,
        the spotlight reuses that project’s title, summary, slug, and featured image first. Manual
        fields below only fill missing gaps.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <label className="tma-console-label">
        Linked case study
        <select
          className={selectClass}
          value={currentId === '' ? '' : String(currentId)}
          onChange={(e) => {
            const value = e.target.value
            set({ caseStudyId: value ? Number.parseInt(value, 10) : null })
          }}
          disabled={disabled}
        >
          <option value="">None — use manual spotlight content</option>
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              {row.title}
              {!row.active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="tma-console-block-fields-hint">
          Linked project: <strong>{selected.title}</strong>
          {!selected.active ? ' (inactive)' : ''}.{' '}
          <a href={`/console/case-studies/${selected.id}`} style={{ color: 'var(--tma-lime)' }}>
            Edit case study
          </a>
        </p>
      ) : null}
    </div>
  )
}

export function ResourceFeedPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const raw = Array.isArray(o.pages) ? o.pages : []
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  const featuredId =
    typeof o.featuredPage === 'number' && Number.isFinite(o.featuredPage) ? o.featuredPage : ''
  const showAllPublished = o.showAllPublished !== false
  const limit =
    typeof o.limit === 'number' && Number.isFinite(o.limit) && o.limit > 0 ? String(o.limit) : '6'

  const [rows, setRows] = useState<
    { id: number; title: string; slug: string; pageType: string; status: string }[]
  >([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/pages', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          pages?: { id: number; title: string; slug: string; pageType: string; status: string }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load pages')
          return
        }
        const resourceRows = (data?.pages ?? []).filter((row) => row.pageType === 'resource')
        setRows(resourceRows)
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addId = (id: number) => {
    if (ids.includes(id)) return
    set({ pages: [...ids, id] })
  }

  const removeAt = (idx: number) => {
    set({ pages: ids.filter((_, i) => i !== idx) })
  }

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Reference published <strong>Resource</strong> pages from the page library. Use one featured
        article and an ordered list below, or enable automatic listing when the block should show all
        published resource pages.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <label className="tma-console-label">
        Featured article
        <select
          className={selectClass}
          value={featuredId === '' ? '' : String(featuredId)}
          onChange={(e) => {
            const value = e.target.value
            set({ featuredPage: value ? Number.parseInt(value, 10) : null })
          }}
          disabled={disabled}
        >
          <option value="">None</option>
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              #{row.id} — {row.title}
              {row.status !== 'published' ? ` (${row.status})` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={showAllPublished}
          onChange={(e) => set({ showAllPublished: e.target.checked })}
          disabled={disabled}
        />
        Auto-list all published resource pages when the manual list is empty
      </label>
      {ids.length === 0 ? (
        <p className="tma-console-lead">No manual resource pages selected yet.</p>
      ) : (
        <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
          {ids.map((id, idx) => {
            const meta = rows.find((row) => row.id === id)
            return (
              <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                <strong>#{id}</strong>
                {meta ? ` — ${meta.title}` : ''}
                {meta && meta.status !== 'published' ? ` (${meta.status})` : ''}
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => removeAt(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <label className="tma-console-label">
        Add resource page
        <select
          className={selectClass}
          value=""
          onChange={(e) => {
            const value = Number.parseInt(e.target.value, 10)
            e.target.value = ''
            if (Number.isFinite(value) && value > 0) addId(value)
          }}
          disabled={disabled || rows.length === 0}
        >
          <option value="">Choose…</option>
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              #{row.id} — {row.title}
              {row.status !== 'published' ? ` (${row.status})` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Max cards
        <input
          className={selectClass}
          type="number"
          min={1}
          max={24}
          value={limit}
          onChange={(e) => set({ limit: Number.parseInt(e.target.value || '6', 10) || 6 })}
          disabled={disabled}
        />
      </label>
    </div>
  )
}

export function ProductFeedPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const raw = Array.isArray(o.products) ? o.products : []
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  const featuredId =
    typeof o.featuredProduct === 'number' && Number.isFinite(o.featuredProduct)
      ? o.featuredProduct
      : ''
  const selectionMode =
    o.selectionMode === 'manual' || o.selectionMode === 'automatic' || o.selectionMode === 'hybrid'
      ? o.selectionMode
      : o.showAllPublished === true && ids.length === 0
        ? 'automatic'
        : 'manual'
  const contentKinds = Array.isArray(o.contentKinds)
    ? o.contentKinds.filter(
        (value): value is ProductContentKind =>
          typeof value === 'string' && PRODUCT_CONTENT_KIND_VALUES.includes(value as ProductContentKind),
      )
    : ['project', 'concept', 'system', 'initiative']
  const sortBy =
    o.sortBy === 'publishedAt' || o.sortBy === 'manual' ? o.sortBy : 'listingPriority'
  const sortDirection = o.sortDirection === 'desc' ? 'desc' : 'asc'
  const showOnlyProjectFeedEligible = o.showOnlyProjectFeedEligible !== false
  const limit =
    typeof o.limit === 'number' && Number.isFinite(o.limit) && o.limit > 0 ? String(o.limit) : '6'

  const [rows, setRows] = useState<
    {
      id: number
      name: string
      slug: string
      status: string
      contentKind: string
      showInProjectFeeds: boolean
      localeAvailability?: { de?: boolean; en?: boolean }
    }[]
  >([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/products', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          products?: {
            id: number
            name: string
            slug: string
            status: string
            contentKind: string
            showInProjectFeeds: boolean
            localeAvailability?: { de?: boolean; en?: boolean }
          }[]
          error?: string
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setErr(data?.error ?? 'Could not load products')
          return
        }
        setRows(data?.products ?? [])
        setErr(null)
      } catch {
        if (!cancelled) setErr('Network error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addId = (id: number) => {
    if (ids.includes(id)) return
    set({ products: [...ids, id] })
  }

  const removeAt = (idx: number) => {
    set({ products: ids.filter((_, i) => i !== idx) })
  }

  return (
    <div className="tma-console-block-fields">
      <p className="tma-console-block-fields-hint">
        Reuse rows from <strong>Projects / Products</strong> for showcase cards. Manual, automatic,
        and hybrid feeds all stay backed by the same <code>cms_product</code> rows.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      <div className="tma-console-field-row">
        <label className="tma-console-label">
          Selection mode
          <select
            className={selectClass}
            value={selectionMode}
            onChange={(e) =>
              set({
                selectionMode:
                  e.target.value === 'automatic' || e.target.value === 'hybrid'
                    ? e.target.value
                    : 'manual',
              })
            }
            disabled={disabled}
          >
            <option value="manual">manual</option>
            <option value="automatic">automatic</option>
            <option value="hybrid">hybrid</option>
          </select>
        </label>
        <label className="tma-console-label">
          Sort automatic items by
          <select
            className={selectClass}
            value={sortBy}
            onChange={(e) =>
              set({
                sortBy:
                  e.target.value === 'publishedAt' || e.target.value === 'manual'
                    ? e.target.value
                    : 'listingPriority',
              })
            }
            disabled={disabled || selectionMode === 'manual'}
          >
            <option value="listingPriority">listingPriority</option>
            <option value="publishedAt">publishedAt</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <label className="tma-console-label">
          Direction
          <select
            className={selectClass}
            value={sortDirection}
            onChange={(e) => set({ sortDirection: e.target.value === 'desc' ? 'desc' : 'asc' })}
            disabled={disabled || selectionMode === 'manual' || sortBy === 'manual'}
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </label>
      </div>
      <label className="tma-console-label" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={showOnlyProjectFeedEligible}
          onChange={(e) => set({ showOnlyProjectFeedEligible: e.target.checked })}
          disabled={disabled}
        />
        Only show project-feed eligible entries
      </label>
      <div className="tma-console-block-fields">
        <span className="tma-console-label">Allowed content types</span>
        <div className="tma-console-field-row">
          {PRODUCT_CONTENT_KIND_VALUES.map((value) => (
            <label
              key={value}
              className="tma-console-label"
              style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={contentKinds.includes(value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...contentKinds, value]
                    : contentKinds.filter((item) => item !== value)
                  set({ contentKinds: next })
                }}
                disabled={disabled}
              />
              {value}
            </label>
          ))}
        </div>
      </div>
      <label className="tma-console-label">
        Featured project
        <select
          className={selectClass}
          value={featuredId === '' ? '' : String(featuredId)}
          onChange={(e) => {
            const value = e.target.value
            set({ featuredProduct: value ? Number.parseInt(value, 10) : null })
          }}
          disabled={disabled}
        >
          <option value="">None</option>
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              #{row.id} — {row.name}
              {row.status !== 'published' ? ` (${row.status})` : ''}
              {` · ${row.contentKind}`}
              {row.showInProjectFeeds ? ' · projects' : ''}
            </option>
          ))}
        </select>
      </label>
      {ids.length === 0 ? (
        <p className="tma-console-lead">No manual projects selected yet.</p>
      ) : (
        <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
          {ids.map((id, idx) => {
            const meta = rows.find((row) => row.id === id)
            return (
              <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                <strong>#{id}</strong>
                {meta ? ` — ${meta.name}` : ''}
                {meta && meta.status !== 'published' ? ` (${meta.status})` : ''}
                {meta ? ` · ${meta.contentKind}` : ''}
                {meta ? ` · ${meta.showInProjectFeeds ? 'projects on' : 'projects off'}` : ''}
                {meta?.localeAvailability ? ` · ${meta.localeAvailability.de ? 'DE' : ''}${meta.localeAvailability.en ? '/EN' : ''}` : ''}
                <button
                  type="button"
                  className="tma-console-btn-danger tma-console-btn-danger--small"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => removeAt(idx)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <label className="tma-console-label">
        Add product
        <select
          className={selectClass}
          value=""
          onChange={(e) => {
            const value = Number.parseInt(e.target.value, 10)
            e.target.value = ''
            if (Number.isFinite(value) && value > 0) addId(value)
          }}
          disabled={disabled || rows.length === 0}
        >
          <option value="">Choose…</option>
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              #{row.id} — {row.name}
              {row.status !== 'published' ? ` (${row.status})` : ''}
              {` · ${row.contentKind}`}
              {row.showInProjectFeeds ? ' · projects' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Max cards
        <input
          className={selectClass}
          type="number"
          min={1}
          max={24}
          value={limit}
          onChange={(e) => set({ limit: Number.parseInt(e.target.value || '6', 10) || 6 })}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
