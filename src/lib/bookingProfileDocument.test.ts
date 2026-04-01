import { describe, expect, it } from 'vitest'

import {
  bookingProfileDocumentToRecord,
  defaultBookingProfileDocument,
  normalizeBookingProfileDocument,
} from '@/lib/bookingProfileDocument'

describe('bookingProfileDocument', () => {
  it('creates sensible defaults', () => {
    const doc = defaultBookingProfileDocument()

    expect(doc.provider).toBe('internal')
    expect(doc.durationMinutes).toBe(30)
    expect(doc.availability.windows.length).toBeGreaterThan(0)
  })

  it('round-trips guided booking documents through the stored JSON shape', () => {
    const source = defaultBookingProfileDocument({
      name: 'Audit review',
      provider: 'calendly',
      durationMinutes: 60,
      bookingUrl: 'https://calendly.com/tma/audit',
      assignedOwner: 'ops@tma.example',
      thankYouPageSlug: 'booking-thanks',
      confirmationEmailTemplate: 7,
      ctaLabel: 'Book audit review',
      helperText: 'Choose a suitable slot.',
      layout: { width: 'wide' },
      availability: {
        slotStepMinutes: 15,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 20,
        windows: [
          {
            id: 'window-a',
            weekday: 2,
            startHour: 10,
            startMinute: 0,
            endHour: 16,
            endMinute: 30,
          },
        ],
      },
      tracking: { source: 'audit-booking' },
    })

    const stored = bookingProfileDocumentToRecord(source)
    const normalized = normalizeBookingProfileDocument(stored)

    expect(normalized.provider).toBe('calendly')
    expect(normalized.durationMinutes).toBe(60)
    expect(normalized.bookingUrl).toBe('https://calendly.com/tma/audit')
    expect(normalized.layout.width).toBe('wide')
    expect(normalized.availability.slotStepMinutes).toBe(15)
    expect(normalized.availability.windows).toHaveLength(1)
    expect(normalized.availability.windows[0]?.weekday).toBe(2)
    expect(normalized.tracking.source).toBe('audit-booking')
  })
})
