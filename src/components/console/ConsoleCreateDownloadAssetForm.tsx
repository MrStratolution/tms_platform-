'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateDownloadAssetForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !fileUrl.trim()) {
      setError('Title and file URL are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/console/download-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), fileUrl: fileUrl.trim() }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        downloadAsset?: { id: number }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Create failed')
        return
      }
      if (data?.downloadAsset?.id) {
        router.push(`/console/downloads/${data.downloadAsset.id}`)
        router.refresh()
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <label className="tma-console-label">
        Title
        <input
          type="text"
          className="tma-console-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
        />
      </label>
      <label className="tma-console-label">
        File URL
        <input
          type="text"
          className="tma-console-input"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          disabled={saving}
          placeholder="/uploads/cms/…"
        />
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  )
}
