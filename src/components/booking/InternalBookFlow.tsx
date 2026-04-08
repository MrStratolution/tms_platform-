'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'
import { readResponseJson } from '@/lib/safeJson'

type Props = {
  profileKey: string
  profileName: string
  thankYouPageSlug?: string | null
  locale?: PublicLocale
}

export function InternalBookFlow({ profileKey, profileName, thankYouPageSlug, locale = 'de' }: Props) {
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
  const copy =
    locale === 'en'
      ? {
          sessionSuffix: 'minute session',
          loadingTimes: 'Loading available times…',
          loadTimesError: 'Could not load times',
          networkTimesError: 'Network error loading times',
          retry: 'Retry',
          noSlots: 'No open slots in the next two weeks. Check back soon.',
          availableDays: 'Available days',
          daysHint: 'Swipe or scroll sideways for more dates',
          chooseTime: `Choose a time for ${profileName}`,
          email: 'Email',
          firstName: 'First name',
          lastName: 'Last name',
          phone: 'Phone (optional)',
          slotConflict: 'That time was just booked. Please pick another slot.',
          bookingFailed: 'Booking failed',
          networkBookingError: 'Network error',
          submitting: 'Booking…',
          confirm: 'Confirm booking',
        }
      : {
          sessionSuffix: 'Minuten Gespräch',
          loadingTimes: 'Verfügbare Zeiten werden geladen…',
          loadTimesError: 'Zeiten konnten nicht geladen werden',
          networkTimesError: 'Netzwerkfehler beim Laden der Zeiten',
          retry: 'Erneut versuchen',
          noSlots: 'In den nächsten zwei Wochen sind aktuell keine freien Termine verfügbar.',
          availableDays: 'Verfügbare Tage',
          daysHint: 'Seitlich wischen oder scrollen, um weitere Termine zu sehen',
          chooseTime: `Wählen Sie eine Zeit für ${profileName}`,
          email: 'E-Mail',
          firstName: 'Vorname',
          lastName: 'Nachname',
          phone: 'Telefon (optional)',
          slotConflict: 'Dieser Termin wurde gerade vergeben. Bitte wählen Sie einen anderen Slot.',
          bookingFailed: 'Buchung fehlgeschlagen',
          networkBookingError: 'Netzwerkfehler',
          submitting: 'Buchung läuft…',
          confirm: 'Buchung bestätigen',
        }

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
        setLoadError(data?.error ?? copy.loadTimesError)
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
      setLoadError(copy.networkTimesError)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [copy.loadTimesError, copy.networkTimesError, profileKey])

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
          language:
            typeof document !== 'undefined'
              ? document.documentElement.lang
              : undefined,
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
        setSubmitError(copy.slotConflict)
        await loadSlots()
        setSelected(null)
        return
      }
      if (!res.ok) {
        setSubmitError(data?.error ?? copy.bookingFailed)
        return
      }
      const thanks = data?.thankYouPageSlug ?? thankYouPageSlug
      if (thanks) {
        router.push(localizePublicHref(`/${thanks}`, locale))
      } else {
        router.push(`${localizePublicHref('/', locale)}?booked=1`)
      }
    } catch {
      setSubmitError(copy.networkBookingError)
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
      <p className="book-flow__meta">{durationMinutes}-{copy.sessionSuffix}</p>

      {loading ? (
        <p className="tma-muted">{copy.loadingTimes}</p>
      ) : loadError ? (
        <div className="book-flow__error" role="alert">
          {loadError}
          <button type="button" className="book-flow__retry" onClick={() => void loadSlots()}>
            {copy.retry}
          </button>
        </div>
      ) : slots.length === 0 ? (
        <p className="tma-muted">{copy.noSlots}</p>
      ) : (
        <>
          <div className="book-flow__day-tabs" role="tablist" aria-label={copy.availableDays}>
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
          <p className="book-flow__day-tabs-hint">{copy.daysHint}</p>

          <fieldset className="book-flow__slots">
            <legend className="sr-only">{copy.chooseTime}</legend>
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
              <span>{copy.email}</span>
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
                <span>{copy.firstName}</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                />
              </label>
              <label className="book-flow__field">
                <span>{copy.lastName}</span>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                />
              </label>
            </div>
            <label className="book-flow__field">
              <span>{copy.phone}</span>
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
              {submitting ? copy.submitting : copy.confirm}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
