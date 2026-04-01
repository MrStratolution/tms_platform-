export type BookingWidth = 'narrow' | 'default' | 'wide' | 'full'
export type BookingProvider = 'internal' | 'calendly' | 'ms_bookings' | 'other'

export type BookingWindow = {
  id: string
  weekday: number
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export type BookingProfileDocument = {
  name: string
  provider: BookingProvider
  durationMinutes: number
  bookingUrl: string
  assignedOwner: string
  thankYouPageSlug: string
  confirmationEmailTemplate: number | null
  ctaLabel: string
  helperText: string
  layout: {
    width: BookingWidth
  }
  availability: {
    slotStepMinutes: number
    bufferBeforeMinutes: number
    bufferAfterMinutes: number
    windows: BookingWindow[]
  }
  tracking: {
    source: string
  }
}

function newWindowId(index: number): string {
  return `window-${index + 1}`
}

export function defaultBookingProfileDocument(
  partial?: Partial<BookingProfileDocument>,
): BookingProfileDocument {
  return {
    name: partial?.name?.trim() || 'Strategy call',
    provider: partial?.provider ?? 'internal',
    durationMinutes:
      typeof partial?.durationMinutes === 'number' && partial.durationMinutes > 0
        ? partial.durationMinutes
        : 30,
    bookingUrl: partial?.bookingUrl?.trim() || '',
    assignedOwner: partial?.assignedOwner?.trim() || '',
    thankYouPageSlug: partial?.thankYouPageSlug?.trim() || 'lead-thanks',
    confirmationEmailTemplate:
      typeof partial?.confirmationEmailTemplate === 'number'
        ? partial.confirmationEmailTemplate
        : null,
    ctaLabel: partial?.ctaLabel?.trim() || 'Choose a time',
    helperText: partial?.helperText?.trim() || '',
    layout: {
      width: partial?.layout?.width ?? 'default',
    },
    availability: {
      slotStepMinutes:
        typeof partial?.availability?.slotStepMinutes === 'number'
          ? partial.availability.slotStepMinutes
          : 30,
      bufferBeforeMinutes:
        typeof partial?.availability?.bufferBeforeMinutes === 'number'
          ? partial.availability.bufferBeforeMinutes
          : 0,
      bufferAfterMinutes:
        typeof partial?.availability?.bufferAfterMinutes === 'number'
          ? partial.availability.bufferAfterMinutes
          : 0,
      windows:
        partial?.availability?.windows && partial.availability.windows.length > 0
          ? partial.availability.windows
          : [
              { id: newWindowId(0), weekday: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
              { id: newWindowId(1), weekday: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
              { id: newWindowId(2), weekday: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
              { id: newWindowId(3), weekday: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
              { id: newWindowId(4), weekday: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
            ],
    },
    tracking: {
      source: partial?.tracking?.source?.trim() || '',
    },
  }
}

export function normalizeBookingProfileDocument(
  raw: Record<string, unknown> | null | undefined,
): BookingProfileDocument {
  const availability =
    raw?.availability && typeof raw.availability === 'object' && !Array.isArray(raw.availability)
      ? (raw.availability as {
          slotStepMinutes?: unknown
          bufferBeforeMinutes?: unknown
          bufferAfterMinutes?: unknown
          windows?: unknown
        })
      : undefined
  const windows = Array.isArray(availability?.windows)
    ? availability.windows
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item, index) => {
          const row = item as Record<string, unknown>
          return {
            id: typeof row.id === 'string' ? row.id : newWindowId(index),
            weekday:
              typeof row.weekday === 'number' && row.weekday >= 0 && row.weekday <= 6
                ? row.weekday
                : 1,
            startHour:
              typeof row.startHour === 'number' && row.startHour >= 0 && row.startHour <= 23
                ? row.startHour
                : 9,
            startMinute:
              typeof row.startMinute === 'number' && row.startMinute >= 0 && row.startMinute <= 59
                ? row.startMinute
                : 0,
            endHour:
              typeof row.endHour === 'number' && row.endHour >= 0 && row.endHour <= 23
                ? row.endHour
                : 17,
            endMinute:
              typeof row.endMinute === 'number' && row.endMinute >= 0 && row.endMinute <= 59
                ? row.endMinute
                : 0,
          }
        })
    : undefined
  const layout =
    raw?.layout && typeof raw.layout === 'object' && !Array.isArray(raw.layout)
      ? (raw.layout as { width?: unknown })
      : undefined
  const tracking =
    raw?.tracking && typeof raw.tracking === 'object' && !Array.isArray(raw.tracking)
      ? (raw.tracking as { source?: unknown })
      : undefined

  return defaultBookingProfileDocument({
    name: typeof raw?.name === 'string' ? raw.name : undefined,
    provider:
      raw?.provider === 'calendly' ||
      raw?.provider === 'ms_bookings' ||
      raw?.provider === 'other'
        ? raw.provider
        : 'internal',
    durationMinutes:
      typeof raw?.durationMinutes === 'number' ? raw.durationMinutes : undefined,
    bookingUrl: typeof raw?.bookingUrl === 'string' ? raw.bookingUrl : undefined,
    assignedOwner:
      typeof raw?.assignedOwner === 'string' ? raw.assignedOwner : undefined,
    thankYouPageSlug:
      typeof raw?.thankYouPageSlug === 'string' ? raw.thankYouPageSlug : undefined,
    confirmationEmailTemplate:
      typeof raw?.confirmationEmailTemplate === 'number'
        ? raw.confirmationEmailTemplate
        : null,
    ctaLabel: typeof raw?.ctaLabel === 'string' ? raw.ctaLabel : undefined,
    helperText: typeof raw?.helperText === 'string' ? raw.helperText : undefined,
    layout: {
      width:
        layout?.width === 'narrow' ||
        layout?.width === 'wide' ||
        layout?.width === 'full'
          ? layout.width
          : 'default',
    },
    availability: {
      slotStepMinutes:
        typeof availability?.slotStepMinutes === 'number'
          ? availability.slotStepMinutes
          : 30,
      bufferBeforeMinutes:
        typeof availability?.bufferBeforeMinutes === 'number'
          ? availability.bufferBeforeMinutes
          : 0,
      bufferAfterMinutes:
        typeof availability?.bufferAfterMinutes === 'number'
          ? availability.bufferAfterMinutes
          : 0,
      windows: windows ?? [],
    },
    tracking: {
      source: typeof tracking?.source === 'string' ? tracking.source : '',
    },
  })
}

export function bookingProfileDocumentToRecord(
  doc: BookingProfileDocument,
): Record<string, unknown> {
  return {
    name: doc.name.trim(),
    provider: doc.provider,
    durationMinutes: doc.durationMinutes,
    bookingUrl: doc.bookingUrl.trim() || null,
    assignedOwner: doc.assignedOwner.trim() || null,
    thankYouPageSlug: doc.thankYouPageSlug.trim() || null,
    confirmationEmailTemplate: doc.confirmationEmailTemplate,
    ctaLabel: doc.ctaLabel.trim() || undefined,
    helperText: doc.helperText.trim() || undefined,
    layout: { width: doc.layout.width },
    availability: {
      slotStepMinutes: doc.availability.slotStepMinutes,
      bufferBeforeMinutes: doc.availability.bufferBeforeMinutes,
      bufferAfterMinutes: doc.availability.bufferAfterMinutes,
      windows: doc.availability.windows.map((window) => ({
        weekday: window.weekday,
        startHour: window.startHour,
        startMinute: window.startMinute,
        endHour: window.endHour,
        endMinute: window.endMinute,
      })),
    },
    tracking: {
      source: doc.tracking.source.trim() || undefined,
    },
  }
}
