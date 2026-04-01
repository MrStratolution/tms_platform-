'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  bookingProfileDocumentToRecord,
  normalizeBookingProfileDocument,
  type BookingProfileDocument,
  type BookingProvider,
  type BookingWindow,
} from '@/lib/bookingProfileDocument'
import { readResponseJson } from '@/lib/safeJson'

type Props = {
  id: number
  initialInternalSlug: string | null
  initialActive: boolean
  initialDocument: Record<string, unknown>
  canEdit: boolean
  canAdvanced?: boolean
}

type EmailTemplateOption = {
  id: number
  name: string
  slug: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function nextWindowId() {
  return `window-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function BookingPreview(props: { profile: BookingProfileDocument }) {
  const { profile } = props
  const widthMap: Record<BookingProfileDocument['layout']['width'], string> = {
    narrow: '24rem',
    default: '28rem',
    wide: '42rem',
    full: '100%',
  }

  return (
    <div className={`block-booking block-booking--${profile.layout.width}`} style={{ maxWidth: widthMap[profile.layout.width], marginTop: '1rem' }}>
      <h2 className="block-booking__title">Book a time</h2>
      <p className="tma-muted">{profile.name}</p>
      {profile.helperText ? <p className="tma-muted">{profile.helperText}</p> : null}
      <button type="button" className="tma-btn tma-btn--primary book-flow__submit" disabled>
        {profile.ctaLabel}
      </button>
    </div>
  )
}

export function ConsoleBookingProfileEditor({
  id,
  initialInternalSlug,
  initialActive,
  initialDocument,
  canEdit,
  canAdvanced = false,
}: Props) {
  const [internalSlug, setInternalSlug] = useState(initialInternalSlug ?? '')
  const [active, setActive] = useState(initialActive)
  const [document, setDocument] = useState<BookingProfileDocument>(() =>
    normalizeBookingProfileDocument(initialDocument),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'builder' | 'advanced'>('builder')
  const [advancedText, setAdvancedText] = useState(() =>
    JSON.stringify(bookingProfileDocumentToRecord(normalizeBookingProfileDocument(initialDocument)), null, 2),
  )
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateOption[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/console/email-templates', { credentials: 'same-origin' })
        const data = await readResponseJson<{
          emailTemplates?: { id: number; name: string; slug: string }[]
        }>(res)
        if (!cancelled && res.ok) {
          setEmailTemplates(
            (data?.emailTemplates ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              slug: row.slug,
            })),
          )
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (tab === 'builder') {
      setAdvancedText(JSON.stringify(bookingProfileDocumentToRecord(document), null, 2))
    }
  }, [document, tab])

  const windowSummary = useMemo(
    () =>
      document.availability.windows
        .map((window) => `${WEEKDAYS[window.weekday]} ${String(window.startHour).padStart(2, '0')}:${String(window.startMinute).padStart(2, '0')} - ${String(window.endHour).padStart(2, '0')}:${String(window.endMinute).padStart(2, '0')}`)
        .join(', '),
    [document.availability.windows],
  )

  function updateWindow(index: number, patch: Partial<BookingWindow>) {
    setDocument((current) => ({
      ...current,
      availability: {
        ...current.availability,
        windows: current.availability.windows.map((window, windowIndex) =>
          windowIndex === index ? { ...window, ...patch } : window,
        ),
      },
    }))
  }

  function addWindow() {
    setDocument((current) => ({
      ...current,
      availability: {
        ...current.availability,
        windows: [
          ...current.availability.windows,
          {
            id: nextWindowId(),
            weekday: 1,
            startHour: 9,
            startMinute: 0,
            endHour: 17,
            endMinute: 0,
          },
        ],
      },
    }))
  }

  function removeWindow(index: number) {
    setDocument((current) => ({
      ...current,
      availability: {
        ...current.availability,
        windows: current.availability.windows.filter((_, windowIndex) => windowIndex !== index),
      },
    }))
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(null)

    let nextDocument = document
    if (tab === 'advanced' && canAdvanced) {
      try {
        const parsed = JSON.parse(advancedText) as Record<string, unknown>
        nextDocument = normalizeBookingProfileDocument(parsed)
        setDocument(nextDocument)
      } catch {
        setError('Document is not valid JSON.')
        return
      }
    }

    const payloadDocument = bookingProfileDocumentToRecord(nextDocument)
    const slugTrim = internalSlug.trim()

    setSaving(true)
    try {
      const res = await fetch(`/api/console/booking-profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active,
          document: payloadDocument,
          internalSlug: slugTrim === '' ? null : slugTrim,
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        bookingProfile?: {
          updatedAt: string
          document?: unknown
          active?: boolean
          internalSlug?: string | null
        }
      }>(res)
      if (!res.ok) {
        setError(data?.error ?? 'Save failed')
        return
      }
      const normalized = normalizeBookingProfileDocument(
        data?.bookingProfile?.document && typeof data.bookingProfile.document === 'object'
          ? (data.bookingProfile.document as Record<string, unknown>)
          : payloadDocument,
      )
      setDocument(normalized)
      setAdvancedText(JSON.stringify(bookingProfileDocumentToRecord(normalized), null, 2))
      setInternalSlug(data?.bookingProfile?.internalSlug ?? slugTrim)
      if (typeof data?.bookingProfile?.active === 'boolean') setActive(data.bookingProfile.active)
      setSuccess(
        `Saved at ${new Date(data?.bookingProfile?.updatedAt ?? Date.now()).toLocaleString()}`,
      )
    } catch {
      setError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const readOnly = !canEdit

  return (
    <form className="tma-console-form" onSubmit={onSave}>
      {readOnly ? (
        <p className="tma-console-env-warning" role="status">
          <strong>View only.</strong> Your role cannot edit content.
        </p>
      ) : null}

      <div className="tma-console-actions" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={tab === 'builder' ? 'tma-console-submit' : 'tma-console-btn-secondary'}
          onClick={() => setTab('builder')}
        >
          Builder
        </button>
        {canAdvanced ? (
          <button
            type="button"
            className={tab === 'advanced' ? 'tma-console-submit' : 'tma-console-btn-secondary'}
            onClick={() => setTab('advanced')}
          >
            Advanced JSON
          </button>
        ) : null}
      </div>

      <div className="tma-console-field-row">
        <label className="tma-console-label">
          Internal slug
          <input
            className="tma-console-input"
            value={internalSlug}
            onChange={(e) => setInternalSlug(e.target.value)}
            disabled={saving || readOnly}
            placeholder="e.g. strategy-call"
            autoComplete="off"
          />
        </label>
        <label className="tma-console-label tma-console-label--inline">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={saving || readOnly}
          />{' '}
          Active
        </label>
      </div>

      {tab === 'advanced' && canAdvanced ? (
        <label className="tma-console-label">
          Document (JSON)
          <textarea
            className="tma-console-textarea-json"
            value={advancedText}
            onChange={(e) => setAdvancedText(e.target.value)}
            disabled={saving || readOnly}
            spellCheck={false}
          />
        </label>
      ) : (
        <>
          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Profile name
              <input
                className="tma-console-input"
                value={document.name}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, name: e.target.value }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Provider
              <select
                className="tma-console-input"
                value={document.provider}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    provider: e.target.value as BookingProvider,
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="internal">Internal booking</option>
                <option value="calendly">Calendly</option>
                <option value="ms_bookings">Microsoft Bookings</option>
                <option value="other">Other external booking</option>
              </select>
            </label>
          </div>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Duration (minutes)
              <input
                className="tma-console-input"
                type="number"
                min={15}
                step={5}
                value={document.durationMinutes}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    durationMinutes: Number.parseInt(e.target.value || '30', 10),
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Width
              <select
                className="tma-console-input"
                value={document.layout.width}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      width: e.target.value as BookingProfileDocument['layout']['width'],
                    },
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="narrow">Narrow</option>
                <option value="default">Default</option>
                <option value="wide">Wide</option>
                <option value="full">Full width</option>
              </select>
            </label>
          </div>

          {document.provider !== 'internal' ? (
            <label className="tma-console-label">
              External booking URL
              <input
                className="tma-console-input"
                value={document.bookingUrl}
                onChange={(e) =>
                  setDocument((current) => ({ ...current, bookingUrl: e.target.value }))
                }
                disabled={saving || readOnly}
                placeholder="https://..."
              />
            </label>
          ) : null}

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Assigned owner
              <input
                className="tma-console-input"
                value={document.assignedOwner}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    assignedOwner: e.target.value,
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Thank-you page slug
              <input
                className="tma-console-input"
                value={document.thankYouPageSlug}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    thankYouPageSlug: e.target.value,
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
          </div>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              CTA label
              <input
                className="tma-console-input"
                value={document.ctaLabel}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    ctaLabel: e.target.value,
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Confirmation email template
              <select
                className="tma-console-input"
                value={document.confirmationEmailTemplate == null ? '' : String(document.confirmationEmailTemplate)}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    confirmationEmailTemplate: e.target.value
                      ? Number.parseInt(e.target.value, 10)
                      : null,
                  }))
                }
                disabled={saving || readOnly}
              >
                <option value="">None</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.slug})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="tma-console-label">
            Helper text
            <textarea
              className="tma-console-textarea-prose"
              value={document.helperText}
              onChange={(e) =>
                setDocument((current) => ({ ...current, helperText: e.target.value }))
              }
              disabled={saving || readOnly}
              rows={3}
            />
          </label>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Slot step (minutes)
              <input
                className="tma-console-input"
                type="number"
                min={5}
                step={5}
                value={document.availability.slotStepMinutes}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    availability: {
                      ...current.availability,
                      slotStepMinutes: Number.parseInt(e.target.value || '30', 10),
                    },
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Tracking source
              <input
                className="tma-console-input"
                value={document.tracking.source}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    tracking: { source: e.target.value },
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
          </div>

          <div className="tma-console-field-row">
            <label className="tma-console-label">
              Buffer before (minutes)
              <input
                className="tma-console-input"
                type="number"
                min={0}
                step={5}
                value={document.availability.bufferBeforeMinutes}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    availability: {
                      ...current.availability,
                      bufferBeforeMinutes: Number.parseInt(e.target.value || '0', 10),
                    },
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
            <label className="tma-console-label">
              Buffer after (minutes)
              <input
                className="tma-console-input"
                type="number"
                min={0}
                step={5}
                value={document.availability.bufferAfterMinutes}
                onChange={(e) =>
                  setDocument((current) => ({
                    ...current,
                    availability: {
                      ...current.availability,
                      bufferAfterMinutes: Number.parseInt(e.target.value || '0', 10),
                    },
                  }))
                }
                disabled={saving || readOnly}
              />
            </label>
          </div>

          <fieldset className="tma-console-fieldset" disabled={saving || readOnly}>
            <legend className="tma-console-subheading">Working hours</legend>
            <p className="tma-console-lead">
              {windowSummary || 'No windows configured yet.'}
            </p>
            {document.availability.windows.map((window, index) => (
              <div key={window.id} className="tma-console-nested-block">
                <div className="tma-console-nested-block__head">
                  <span className="tma-console-nested-block__title">Window {index + 1}</span>
                  <button type="button" className="tma-console-btn-danger tma-console-btn-danger--small" onClick={() => removeWindow(index)}>
                    Remove
                  </button>
                </div>
                <div className="tma-console-field-row">
                  <label className="tma-console-label">
                    Weekday
                    <select
                      className="tma-console-input"
                      value={String(window.weekday)}
                      onChange={(e) =>
                        updateWindow(index, { weekday: Number.parseInt(e.target.value, 10) })
                      }
                    >
                      {WEEKDAYS.map((weekday, weekdayIndex) => (
                        <option key={weekday} value={weekdayIndex}>
                          {weekday}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="tma-console-label">
                    Start hour
                    <input
                      className="tma-console-input"
                      type="number"
                      min={0}
                      max={23}
                      value={window.startHour}
                      onChange={(e) =>
                        updateWindow(index, { startHour: Number.parseInt(e.target.value || '0', 10) })
                      }
                    />
                  </label>
                  <label className="tma-console-label">
                    Start minute
                    <input
                      className="tma-console-input"
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={window.startMinute}
                      onChange={(e) =>
                        updateWindow(index, { startMinute: Number.parseInt(e.target.value || '0', 10) })
                      }
                    />
                  </label>
                  <label className="tma-console-label">
                    End hour
                    <input
                      className="tma-console-input"
                      type="number"
                      min={0}
                      max={23}
                      value={window.endHour}
                      onChange={(e) =>
                        updateWindow(index, { endHour: Number.parseInt(e.target.value || '0', 10) })
                      }
                    />
                  </label>
                  <label className="tma-console-label">
                    End minute
                    <input
                      className="tma-console-input"
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={window.endMinute}
                      onChange={(e) =>
                        updateWindow(index, { endMinute: Number.parseInt(e.target.value || '0', 10) })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <div className="tma-console-actions">
              <button type="button" className="tma-console-btn-secondary" onClick={addWindow}>
                Add window
              </button>
            </div>
          </fieldset>

          <div>
            <h2 className="tma-console-subheading">Preview</h2>
            <BookingPreview profile={document} />
          </div>
        </>
      )}

      {error ? <p className="tma-console-error">{error}</p> : null}
      {success ? <p className="tma-console-success">{success}</p> : null}

      {canEdit ? (
        <div className="tma-console-actions">
          <button type="submit" className="tma-console-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
