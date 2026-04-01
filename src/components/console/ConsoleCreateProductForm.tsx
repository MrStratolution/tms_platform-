'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateProductForm() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/console/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          status,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        product?: { id: number }
      }>(res)
      if (!res.ok || !data?.product?.id) {
        setError(data?.error ?? 'Create failed')
        return
      }
      router.push(`/console/products/${data.product.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">
        Slug (URL segment under <code>/products/</code>)
        <input
          className="tma-console-input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-offer"
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        Display name
        <input
          className="tma-console-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={busy}
          autoComplete="off"
        />
      </label>
      <label className="tma-console-label">
        Status
        <select
          className="tma-console-input"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value === 'published' ? 'published' : 'draft')
          }
          disabled={busy}
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create product'}
        </button>
      </div>
    </form>
  )
}
