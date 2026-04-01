'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { adminCopy, normalizeAdminUiLocale } from '@/lib/adminI18n'
import { readResponseJson } from '@/lib/safeJson'

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing' },
  { value: 'blank', label: 'Blank' },
  { value: 'services', label: 'Services' },
  { value: 'contact', label: 'Contact' },
  { value: 'thank_you', label: 'Thank-you' },
  { value: 'product', label: 'Product' },
  { value: 'industry', label: 'Industry' },
  { value: 'home', label: 'Home' },
  { value: 'resource', label: 'Resource' },
  { value: 'other', label: 'Other' },
] as const

const TEMPLATES = [
  { value: 'blank', label: 'Blank document' },
  { value: 'landing', label: 'Landing starter' },
  { value: 'service', label: 'Service starter' },
  { value: 'contact', label: 'Contact starter' },
  { value: 'thank_you', label: 'Thank-you starter' },
] as const

export function ConsoleCreatePageForm(props: { canPublishLive?: boolean; uiLocale?: string }) {
  const { canPublishLive = false, uiLocale = 'de' } = props
  const t = (key: Parameters<typeof adminCopy>[1]) => adminCopy(normalizeAdminUiLocale(uiLocale), key)
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState<string>('landing')
  const [template, setTemplate] = useState<string>('blank')
  const [status, setStatus] = useState<'draft' | 'review' | 'published'>('draft')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/console/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          pageType,
          template,
          status,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        page?: { id: number }
      }>(res)
      if (!res.ok || !data?.page?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/pages/${data.page.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <p className="tma-console-hint" style={{ marginBottom: '1rem' }}>
        {t('createPageHint')}
      </p>
      <label className="tma-console-label">
        {t('createPageSlug')}
        <input
          className="tma-console-input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-new-page"
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        {t('createPageTitleField')}
        <input
          className="tma-console-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        {t('createPageType')}
        <select
          className="tma-console-input"
          value={pageType}
          onChange={(e) => setPageType(e.target.value)}
          disabled={busy}
        >
          {PAGE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        {t('createPageTemplate')}
        <select
          className="tma-console-input"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          disabled={busy}
        >
          {TEMPLATES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        {t('createPageStatus')}
        <select
          className="tma-console-input"
          value={status}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'published' || v === 'review' || v === 'draft') setStatus(v)
          }}
          disabled={busy}
        >
          <option value="draft">draft</option>
          <option value="review">review (await publish by ops/admin)</option>
          {canPublishLive ? <option value="published">published (live)</option> : null}
        </select>
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Creating…' : t('createPageSubmit')}
        </button>
      </div>
    </form>
  )
}
