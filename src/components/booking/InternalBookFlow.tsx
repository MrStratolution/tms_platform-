'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { readResponseJson } from '@/lib/safeJson'

type Props = {
  profileKey: string
  profileName: string
  thankYouPageSlug?: string | null
}

export function InternalBookFlow({ profileKey, profileName, thankYouPageSlug }: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadSlots = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/bookings/slots?key=${encodeURIComponent(profileKey)}&days=14`,
        { cache: 'no-store' },
      )
      const data = await readResponseJson<{
        slots?: string[]
        durationMinutes?: number
        error?: string
      }>(res)
      if (!res.ok) {
        setLoadError(data?.error ?? 'Could not load times')
        setSlots([])
        setSelectedDay(null)
        return
      }
      
      const loadedSlots = data?.slots ?? []
      setSlots(loadedSlots)
      
      if (loadedSlots.length > 0) {
        // Set first available day as selected
        const firstDate = new Date(loadedSlots[0]!)
        setSelectedDay(firstDate.toISOString().split('T')[0] ?? null)
      } else {
        setSelectedDay(null)
      }
      
      if (typeof data?.durationMinutes === 'number') {
        setDurationMinutes(data.durationMinutes)
      }
    } catch {
      setLoadError('Network error loading times')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [profileKey])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingProfileKey: profileKey,
          scheduledFor: selected,
          lead: {
            email,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: phone || undefined,
          },
        }),
      })
      const data = await readResponseJson<{
        ok?: boolean
        error?: string
        thankYouPageSlug?: string | null
      }>(res)
      if (res.status === 409) {
        setSubmitError('That time was just booked. Please pick another slot.')
        await loadSlots()
        setSelected(null)
        return
      }
      if (!res.ok) {
        setSubmitError(data?.error ?? 'Booking failed')
        return
      }
      const thanks = data?.thankYouPageSlug ?? thankYouPageSlug
      if (thanks) {
        router.push(`/${thanks}`)
      } else {
        router.push('/?booked=1')
      }
    } catch {
      setSubmitError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const dayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Group slots by YYYY-MM-DD
  const slotsByDay: Record<string, string[]> = {}
  for (const iso of slots) {
    const d = new Date(iso)
    const key = d.toISOString().split('T')[0]!
    if (!slotsByDay[key]) slotsByDay[key] = []
    slotsByDay[key]!.push(iso)
  }
  const availableDays = Object.keys(slotsByDay).sort()
  const slotsForSelectedDay = selectedDay ? slotsByDay[selectedDay] || [] : []

  return (
    <div className="book-flow">
      <p className="book-flow__meta">{durationMinutes}-minute session</p>

      {loading ? (
        <p className="tma-muted">Loading available times…</p>
      ) : loadError ? (
        <div className="book-flow__error" role="alert">
          {loadError}
          <button type="button" className="book-flow__retry" onClick={() => void loadSlots()}>
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <p className="tma-muted">No open slots in the next two weeks. Check back soon.</p>
      ) : (
        <>
          <div className="book-flow__day-tabs" role="tablist" aria-label="Available days">
            {availableDays.map((day) => {
              // Parse 'YYYY-MM-DD' back to a local date at noon to avoid timezone shift in display
              const [y, m, d] = day.split('-').map(Number)
              const dateObj = new Date(y!, m! - 1, d!, 12, 0, 0)
              
              return (
                <button
                  key={day}
                  role="tab"
                  type="button"
                  aria-selected={selectedDay === day}
                  className="book-flow__day-tab"
                  onClick={() => {
                    setSelectedDay(day)
                    setSelected(null) // clear selected time when changing day
                  }}
                >
                  {dayFormatter.format(dateObj)}
                </button>
              )
            })}
          </div>
          <p className="book-flow__day-tabs-hint">Swipe or scroll sideways for more dates</p>

          <fieldset className="book-flow__slots">
            <legend className="sr-only">Choose a time for {profileName}</legend>
            <div className="book-flow__slot-grid">
              {slotsForSelectedDay.map((iso, i) => (
                <label key={iso} className="book-flow__slot" htmlFor={`slot-${i}`}>
                  <input
                    id={`slot-${i}`}
                    type="radio"
                    name="slot"
                    value={iso}
                    checked={selected === iso}
                    onChange={() => setSelected(iso)}
                  />
                  <span>{timeFormatter.format(new Date(iso))}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <form className="book-flow__form" onSubmit={onConfirm}>
            <label className="book-flow__field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </label>
            <div className="book-flow__row">
              <label className="book-flow__field">
                <span>First name</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                />
              </label>
              <label className="book-flow__field">
                <span>Last name</span>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                />
              </label>
            </div>
            <label className="book-flow__field">
              <span>Phone (optional)</span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
              />
            </label>
            {submitError ? (
              <p className="book-flow__error" role="alert">
                {submitError}
              </p>
            ) : null}
            <button
              type="submit"
              className="tma-btn tma-btn--primary book-flow__submit"
              disabled={!selected || submitting}
            >
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
