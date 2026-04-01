'use client'

import { useEffect, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

const selectClass = 'tma-console-input tma-console-input--compact'

export function TestimonialSliderPicker(props: {
  o: Record<string, unknown>
  set: (patch: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { o, set, disabled } = props
  const raw = Array.isArray(o.testimonials) ? o.testimonials : []
  const ids = raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))

  const [rows, setRows] = useState<{ id: number; author: string; quote: string; active: boolean }[]>(
    [],
  )
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/testimonials', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          testimonials?: { id: number; author: string; quote: string; active: boolean }[]
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
      <p className="tma-console-block-fields-hint">
        Reference rows from <strong>Testimonials</strong> in the console. Order matches the public
        slider. Inline testimonial objects in JSON still work; numeric ids load from the library.
      </p>
      {err ? <p className="tma-console-error">{err}</p> : null}
      {ids.length === 0 ? (
        <p className="tma-console-lead">No library ids yet — add below or keep inline objects in raw JSON.</p>
      ) : (
        <ol className="tma-console-lead" style={{ paddingLeft: '1.25rem' }}>
          {ids.map((id, idx) => {
            const meta = rows.find((r) => r.id === id)
            return (
              <li key={`${id}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                <strong>#{id}</strong>
                {meta ? ` — ${meta.author}` : ''}
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
        Add testimonial by id
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
              #{r.id} — {r.author.slice(0, 48)}
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
        When you add at least one library id below, the public page uses <strong>FAQ entries</strong>{' '}
        in this order and ignores inline items for that block. Clear all ids to use inline Q&amp;A only.
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
          Clear library ids (use inline items only)
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
