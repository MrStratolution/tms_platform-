'use client'

import { useEffect, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type IndustryRow = {
  id: number
  name: string
  active: boolean
}

type Props = {
  label: string
  value: number | null
  onChange: (next: number | null) => void
  disabled?: boolean
  helpText?: string
}

export function ConsoleIndustrySelectField({
  label,
  value,
  onChange,
  disabled = false,
  helpText,
}: Props) {
  const [items, setItems] = useState<IndustryRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/industries', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          ok?: boolean
          error?: string
          industries?: { id: number; name: string; active?: boolean | null }[]
        }>(res)
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error ?? 'Could not load industries.')
          return
        }
        setItems(
          (data?.industries ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            active: row.active !== false,
          })),
        )
        setError(null)
      } catch {
        if (!cancelled) setError('Network error loading industries.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <label className="tma-console-label">
      <span>{label}</span>
      {helpText ? <span className="tma-console-block-fields-hint">{helpText}</span> : null}
      <select
        className="tma-console-input"
        value={value != null ? String(value) : ''}
        onChange={(e) => {
          const next = e.target.value.trim()
          onChange(next ? Number.parseInt(next, 10) || null : null)
        }}
        disabled={disabled}
      >
        <option value="">No industry</option>
        {items.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.name}
            {!item.active ? ' (inactive)' : ''}
          </option>
        ))}
      </select>
      {error ? <span className="tma-console-error">{error}</span> : null}
    </label>
  )
}
