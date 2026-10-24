const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

export function toDayStamp(year: number, month: number, day: number) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

export function nextDayStamp(stamp: string) {
  const date = new Date(Date.UTC(Number(stamp.slice(0, 4)), Number(stamp.slice(4, 6)) - 1, Number(stamp.slice(6, 8))))
  date.setUTCDate(date.getUTCDate() + 1)
  return toDayStamp(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

// Parses display ranges like "27–29 August 2027" or "27 August 2027" into YYYYMMDD stamps.
export function parseDateRange(raw: string): { start: string; end: string } | null {
  const normalized = raw.replace(/[–—]/g, '-').trim()
  const match = normalized.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+)\.?(\s+\d{4})?$/)
  if (!match) return null
  const month = MONTHS[match[3].toLowerCase()]
  if (!month) return null
  const year = match[4] ? Number(match[4].trim()) : new Date().getUTCFullYear()
  const startDay = Number(match[1])
  const endDay = match[2] ? Number(match[2]) : startDay
  if (endDay < startDay) return null
  return { start: toDayStamp(year, month, startDay), end: toDayStamp(year, month, endDay) }
}

// "20270827" -> "2027-08-27" for schema.org ISO-8601 dates.
export function isoFromStamp(stamp: string) {
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`
}

export function isoRange(raw: string): { start: string; end: string } | null {
  const range = parseDateRange(raw)
  if (!range) return null
  return { start: isoFromStamp(range.start), end: isoFromStamp(range.end) }
}
