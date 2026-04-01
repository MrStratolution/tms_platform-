'use client'

import { useCallback, useEffect, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type LocRow = {
  id: number
  locale: string
  sourceLocale: string | null
  jobStatus: string | null
  lastError: string | null
  updatedAt: string
}

export function ConsolePageTranslationsPanel(props: {
  pageId: number
  canEdit: boolean
  disabled?: boolean
}) {
  const { pageId, canEdit, disabled } = props
  const [rows, setRows] = useState<LocRow[]>([])
  const [locale, setLocale] = useState('en')
  const [sourceLocale, setSourceLocale] = useState('de')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/console/pages/${pageId}/localizations`, {
        credentials: 'same-origin',
      })
      const data = await readResponseJson<{ ok?: boolean; localizations?: LocRow[]; error?: string }>(
        res,
      )
      if (!res.ok) {
        setErr(data?.error ?? 'Could not load translations')
        setRows([])
        return
      }
      setRows(data?.localizations ?? [])
    } catch {
      setErr('Network error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    void load()
  }, [load])

  async function queueOne(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || disabled || busy) return
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch(`/api/console/pages/${pageId}/localizations`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: locale.trim(),
          sourceLocale: sourceLocale.trim() || undefined,
        }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setErr(data?.error ?? 'Queue failed')
        return
      }
      setMsg('Translation job queued. Run the AI worker (see README) to process.')
      await load()
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="tma-console-fieldset" disabled={disabled || busy || !canEdit}>
      <legend className="tma-console-subheading">Translations (AI)</legend>
      <p className="tma-console-hint" style={{ marginTop: 0 }}>
        Queue jobs to translate <strong>hero, SEO, and all layout blocks</strong> for a locale. Requires{' '}
        <code>TMA_AI_API_KEY</code> (or <code>OPENAI_API_KEY</code>) and optional{' '}
        <code>TMA_AI_BASE_URL</code>. After queuing, run{' '}
        <code>POST /api/integrations/ai/run-localization-jobs</code> (cron) or the console AI localize
        endpoint. Set <code>localizationAutomation.autoQueueOnPublish</code> in the page JSON to queue on
        first publish.
      </p>
      {loading ? <p className="tma-console-lead">Loading…</p> : null}
      {err ? <p className="tma-console-error">{err}</p> : null}
      {msg ? <p className="tma-console-success">{msg}</p> : null}

      {rows.length > 0 ? (
        <ul className="tma-console-block-fields" style={{ marginTop: '0.5rem', paddingInlineStart: '1.25rem' }}>
          {rows.map((r) => (
            <li key={r.id}>
              <strong>{r.locale}</strong> — {r.jobStatus ?? 'unknown'}
              {r.lastError ? <span className="tma-console-error"> — {r.lastError}</span> : null}
              <span className="tma-console-hint"> · updated {r.updatedAt}</span>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="tma-console-lead">No translation jobs yet.</p>
      ) : null}

      <form className="tma-console-block-fields" onSubmit={queueOne}>
        <label className="tma-console-label">
          Target locale (e.g. de, fr, ar)
          <input
            className="tma-console-input tma-console-input--compact"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            placeholder="de"
            required
          />
        </label>
        <label className="tma-console-label">
          Source locale
          <input
            className="tma-console-input tma-console-input--compact"
            value={sourceLocale}
            onChange={(e) => setSourceLocale(e.target.value)}
            placeholder="en"
          />
        </label>
        <button type="submit" className="tma-console-btn-secondary" disabled={!canEdit || disabled || busy}>
          Queue translation
        </button>
        <button
          type="button"
          className="tma-console-btn-secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          Refresh list
        </button>
      </form>
    </fieldset>
  )
}
