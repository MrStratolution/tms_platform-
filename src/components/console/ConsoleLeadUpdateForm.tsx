'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConsoleLeadCopilotPanel } from '@/components/console/ConsoleLeadCopilotPanel'
import { readResponseJson } from '@/lib/safeJson'

const STATUSES = ['new', 'contacted', 'qualified', 'lost', 'won'] as const

type Props = {
  leadId: number
  initialOwner: string | null
  initialLeadStatus: string
  initialNotes: string | null
  canEdit: boolean
  canUseAi: boolean
  adminWhatsappNumber: string | null
  bookingEvent: {
    id: number
    status: string
    scheduledFor: string | null
    bookingProfileName: string | null
  } | null
}

export function ConsoleLeadUpdateForm(props: Props) {
  const router = useRouter()
  const [owner, setOwner] = useState(props.initialOwner ?? '')
  const [leadStatus, setLeadStatus] = useState(props.initialLeadStatus)
  const [notes, setNotes] = useState(props.initialNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function applySuggestedNote(value: string) {
    setNotes((current) => {
      const trimmedCurrent = current.trim()
      if (!trimmedCurrent) return value
      if (trimmedCurrent.includes(value)) return current
      return `${trimmedCurrent}\n\n${value}`
    })
    setSuccess('AI note inserted. Save changes to keep it.')
  }

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

  async function onCancelBooking() {
    if (!props.canEdit || !props.bookingEvent || props.bookingEvent.status === 'cancelled') {
      return
    }
    setError(null)
    setSuccess(null)
    setCancelBusy(true)
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingEventId: props.bookingEvent.id,
          reason: cancelReason.trim() || undefined,
        }),
      })
      const data = await readResponseJson<{ success?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Booking cancellation failed')
        return
      }
      setSuccess('Booking cancelled.')
      setCancelReason('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setCancelBusy(false)
    }
  }

  if (!props.canEdit) {
    return (
      <p className="tma-console-env-warning" role="status">
        <strong>View only.</strong> Your role cannot update leads. Use <code>ops</code> or{' '}
        <code>admin</code>.
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
      {props.bookingEvent ? (
        <section className="tma-console-note">
          <h3 className="tma-console-subheading">Booking</h3>
          <p className="tma-console-lead">
            <strong>Status:</strong> {props.bookingEvent.status}
            <br />
            <strong>Profile:</strong> {props.bookingEvent.bookingProfileName ?? '—'}
            <br />
            <strong>Scheduled for:</strong>{' '}
            {props.bookingEvent.scheduledFor
              ? new Date(props.bookingEvent.scheduledFor).toLocaleString()
              : '—'}
          </p>
          {props.bookingEvent.status !== 'cancelled' ? (
            <>
              <label className="tma-console-label">
                Cancellation reason (optional)
                <textarea
                  className="tma-console-textarea-prose"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelBusy}
                  placeholder="Short note for the email log and cancellation record"
                />
              </label>
              <div className="tma-console-actions">
                <button
                  type="button"
                  className="tma-console-btn-danger"
                  onClick={() => {
                    void onCancelBooking()
                  }}
                  disabled={cancelBusy}
                >
                  {cancelBusy ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </div>
            </>
          ) : (
            <p className="tma-console-hint">
              This booking is already cancelled.
            </p>
          )}
        </section>
      ) : null}
      <ConsoleLeadCopilotPanel
        leadId={props.leadId}
        canUseAi={props.canUseAi}
        adminWhatsappNumber={props.adminWhatsappNumber}
        onApplySuggestedNote={props.canEdit ? applySuggestedNote : undefined}
      />
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
