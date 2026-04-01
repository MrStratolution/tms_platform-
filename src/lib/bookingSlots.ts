/**
 * Slot generation uses the **server process timezone** (`TZ` env).
 * Set `TZ=Europe/Berlin` (etc.) in production so windows match your business hours.
 */

export type AvailabilityWindow = {
  /** 0 = Sunday … 6 = Saturday (same as `Date#getDay()`). */
  weekday: number
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export type AvailabilityConfig = {
  windows?: AvailabilityWindow[] | null
  /** Gap between slot starts; defaults to `durationMinutes`. */
  slotStepMinutes?: number | null
}

const DEFAULT_WINDOWS: AvailabilityWindow[] = [
  { weekday: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  { weekday: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  { weekday: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  { weekday: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  { weekday: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
]

function windowsFromConfig(config: unknown): AvailabilityWindow[] {
  if (config == null || typeof config !== 'object') return DEFAULT_WINDOWS
  const c = config as AvailabilityConfig
  if (!Array.isArray(c.windows) || c.windows.length === 0) return DEFAULT_WINDOWS
  return c.windows.filter(
    (w): w is AvailabilityWindow =>
      typeof w === 'object' &&
      w != null &&
      typeof (w as AvailabilityWindow).weekday === 'number' &&
      typeof (w as AvailabilityWindow).startHour === 'number' &&
      typeof (w as AvailabilityWindow).endHour === 'number',
  )
}

function atLocalDate(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m, d, hh, mm, 0, 0)
}

/**
 * Returns ISO strings for slot **start** times between `from` and `to` (inclusive start day, exclusive end day boundary).
 */
export function generateSlotStartsISO(params: {
  from: Date
  to: Date
  durationMinutes: number
  availability?: unknown
}): string[] {
  const { from, to, durationMinutes } = params
  const windows = windowsFromConfig(params.availability)
  const step =
    (params.availability as AvailabilityConfig | null | undefined)?.slotStepMinutes ??
    durationMinutes
  if (step < 5 || durationMinutes < 5) return []

  const slots: string[] = []
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)
  const endDay = new Date(to)
  endDay.setHours(23, 59, 59, 999)

  while (cursor <= endDay) {
    const wd = cursor.getDay()
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()
    const da = cursor.getDate()

    for (const w of windows) {
      if (w.weekday !== wd) continue
      let t = atLocalDate(y, mo, da, w.startHour, w.startMinute)
      const dayEnd = atLocalDate(y, mo, da, w.endHour, w.endMinute)
      const endLimit = dayEnd.getTime() - durationMinutes * 60_000

      while (t.getTime() <= endLimit) {
        if (t >= from && t <= to) {
          slots.push(t.toISOString())
        }
        t = new Date(t.getTime() + step * 60_000)
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return slots
}
