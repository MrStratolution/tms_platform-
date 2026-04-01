'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  LAYOUT_BLOCK_ADD_OPTIONS,
  createDefaultLayoutBlock,
  type LayoutBlockType,
} from '@/lib/cms/layoutBlockPresets'
import { readResponseJson } from '@/lib/safeJson'

export function ConsoleCreateLayoutBlockForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [blockType, setBlockType] = useState<LayoutBlockType>('cta')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    const block = createDefaultLayoutBlock(blockType)
    setSaving(true)
    try {
      const res = await fetch('/api/console/layout-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), block }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        layoutBlock?: { id: number }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Create failed')
        return
      }
      if (data?.layoutBlock?.id) {
        router.push(`/console/layout-blocks/${data.layoutBlock.id}`)
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
        Name
        <input
          type="text"
          className="tma-console-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          placeholder="e.g. Standard CTA strip"
        />
      </label>
      <label className="tma-console-label">
        Starter block type
        <select
          className="tma-console-input"
          value={blockType}
          onChange={(e) => setBlockType(e.target.value as LayoutBlockType)}
          disabled={saving}
        >
          {LAYOUT_BLOCK_ADD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
