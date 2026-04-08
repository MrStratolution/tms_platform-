import { describe, expect, it } from 'vitest'

import { filterBookedSlotStartsISO } from '@/lib/bookingSlots'

describe('filterBookedSlotStartsISO', () => {
  it('keeps all slots when there are no booked events', () => {
    const slots = [
      '2026-04-08T09:00:00.000Z',
      '2026-04-08T09:30:00.000Z',
      '2026-04-08T10:00:00.000Z',
    ]

    expect(
      filterBookedSlotStartsISO({
        slotStartsIso: slots,
        bookedStarts: [],
        durationMinutes: 30,
      }),
    ).toEqual(slots)
  })

  it('removes exact booked slot starts', () => {
    expect(
      filterBookedSlotStartsISO({
        slotStartsIso: [
          '2026-04-08T09:00:00.000Z',
          '2026-04-08T09:30:00.000Z',
          '2026-04-08T10:00:00.000Z',
        ],
        bookedStarts: ['2026-04-08T09:30:00.000Z'],
        durationMinutes: 30,
      }),
    ).toEqual(['2026-04-08T09:00:00.000Z', '2026-04-08T10:00:00.000Z'])
  })

  it('removes overlapping slots when booking buffers are configured', () => {
    expect(
      filterBookedSlotStartsISO({
        slotStartsIso: [
          '2026-04-08T09:30:00.000Z',
          '2026-04-08T10:00:00.000Z',
          '2026-04-08T10:30:00.000Z',
          '2026-04-08T11:00:00.000Z',
        ],
        bookedStarts: ['2026-04-08T10:00:00.000Z'],
        durationMinutes: 30,
        bufferAfterMinutes: 15,
      }),
    ).toEqual(['2026-04-08T11:00:00.000Z'])
  })
})
