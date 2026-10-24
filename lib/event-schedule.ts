import { isoFromStamp, parseDateRange } from './event-dates'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export type EventSchedule = {
  date?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  venue?: string
  hall?: string
  city?: string
  state?: string
  pin?: string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/

function isoDay(value?: string) {
  return value && ISO_DAY.test(value) ? value : null
}

function dayParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

/**
 * Prefers the admin-picked dates and only falls back to the legacy free-text
 * date, so editions saved before the structured fields still render.
 */
export function eventDateRange(item: EventSchedule): { start: string; end: string } | null {
  const start = isoDay(item.startDate)
  if (start) {
    const rawEnd = isoDay(item.endDate)
    return { start, end: rawEnd && rawEnd >= start ? rawEnd : start }
  }
  const legacy = parseDateRange(item.date || '')
  if (!legacy) return null
  return { start: isoFromStamp(legacy.start), end: isoFromStamp(legacy.end) }
}

export function formatEventDates(item: EventSchedule) {
  const range = eventDateRange(item)
  if (!range) return item.date || ''
  const start = dayParts(range.start)
  const end = dayParts(range.end)
  if (start.year === end.year && start.month === end.month && start.day === end.day) {
    return `${start.day} ${MONTHS[start.month - 1]} ${start.year}`
  }
  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${end.day} ${MONTHS[start.month - 1]} ${start.year}`
  }
  if (start.year === end.year) {
    return `${start.day} ${MONTHS[start.month - 1]} – ${end.day} ${MONTHS[end.month - 1]} ${start.year}`
  }
  return `${start.day} ${MONTHS[start.month - 1]} ${start.year} – ${end.day} ${MONTHS[end.month - 1]} ${end.year}`
}

function twelveHour(clock: string) {
  const match = CLOCK.exec(clock.trim())
  if (!match) return ''
  const hour = Number(match[1])
  const minute = match[2]
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatEventTimes(item: EventSchedule) {
  const start = item.startTime ? twelveHour(item.startTime) : ''
  const end = item.endTime ? twelveHour(item.endTime) : ''
  if (start && end) return `${start} – ${end}`
  return start || end
}

/** venue, city, state and PIN — skipping a city already spelled out inside the venue name. */
export function formatEventPlace(item: EventSchedule) {
  const venue = (item.venue || '').trim()
  const city = (item.city || '').trim()
  const state = (item.state || '').trim()
  const pin = (item.pin || '').trim()
  const parts: string[] = []
  if (venue) parts.push(venue)
  if (city && !venue.toLowerCase().includes(city.toLowerCase())) parts.push(city)
  if (state) parts.push(pin ? `${state} ${pin}` : state)
  else if (pin) parts.push(`PIN ${pin}`)
  return parts.filter((part, index) => parts.indexOf(part) === index).join(', ')
}

/** One string for maps, calendar and JSON-LD so every surface points at the same place. */
export function eventMapQuery(item: EventSchedule) {
  const place = formatEventPlace(item)
  return place ? `${place}, India` : ''
}

/** Basic-format UTC stamps for .ics, or null when the admin left the times blank. */
export function eventUtcStamps(item: EventSchedule): { start: string; end: string } | null {
  const range = eventDateRange(item)
  const startClock = CLOCK.exec((item.startTime || '').trim())
  if (!range || !startClock) return null
  const endClock = CLOCK.exec((item.endTime || '').trim())
  // An end clock earlier than the start reads as closing after midnight.
  const endsNextDay = Boolean(endClock) && item.endTime! <= item.startTime!
  const endDay = endsNextDay ? addDay(range.end) : range.end
  const start = toUtcBasic(`${range.start}T${startClock[1].padStart(2, '0')}:${startClock[2]}:00`)
  const end = toUtcBasic(`${endDay}T${endClock ? `${endClock[1].padStart(2, '0')}:${endClock[2]}` : '23:59'}:00`)
  if (!start || !end) return null
  return { start, end }
}

function addDay(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

// Events are held in India and content stores local clock time without an offset.
function toUtcBasic(local: string) {
  const utc = new Date(`${local}+05:30`)
  if (Number.isNaN(utc.getTime())) return ''
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}
