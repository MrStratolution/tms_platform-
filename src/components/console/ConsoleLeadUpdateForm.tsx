'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

const STATUSES = ['new', 'contacted', 'qualified', 'lost', 'won'] as const

type Props = {
  leadId: number
  initialOwner: string | null
  initialLeadStatus: string
  initialNotes: string | null
  canEdit: boolean
}

export function ConsoleLeadUpdateForm(props: Props) {
  const router = useRouter()
  const [owner, setOwner] = useState(props.initialOwner ?? '')
  const [leadStatus, setLeadStatus] = useState(props.initialLeadStatus)
  const [notes, setNotes] = useState(props.initialNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!props.canEdit) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/console/leads/${props.leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: owner.trim() || null,
          leadStatus,
          notes: notes.trim() || null,
        }),
      })
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Update failed')
        return
      }
      setSuccess('Saved.')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  if (!props.canEdit) {
    return (
      <p className="tma-console-env-warning" role="status">
        <strong>View only.</strong> Your role cannot update leads. Use <code>ops</code>,{' '}
        <code>editor</code>, or <code>admin</code>.
      </p>
    )
  }

  return (
    <form className="tma-console-form" onSubmit={onSubmit}>
      <h2 className="tma-console-subheading">Update lead</h2>
      <label className="tma-console-label">
        Owner (assignee)
        <input
          className="tma-console-input"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          disabled={busy}
          autoComplete="off"
          placeholder="e.g. ae@company.com"
        />
      </label>
      <label className="tma-console-label">
        Lead status
        <select
          className="tma-console-input"
          value={leadStatus}
          onChange={(e) => setLeadStatus(e.target.value)}
          disabled={busy}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="tma-console-label">
        Notes
        <textarea
          className="tma-console-input"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
        />
      </label>
      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}
      <div className="tma-console-actions">
        <button type="submit" className="tma-console-submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
