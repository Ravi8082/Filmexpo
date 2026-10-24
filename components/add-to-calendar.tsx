'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, Download, Navigation } from 'lucide-react'
import { nextDayStamp } from '@/lib/event-dates'
import {
  eventDateRange,
  eventMapQuery,
  eventUtcStamps,
  formatEventDates,
  formatEventPlace,
  formatEventTimes,
  type EventSchedule,
} from '@/lib/event-schedule'

function escapeIcsText(value: string) {
  return value.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

function dayStamp(iso: string) {
  return iso.replace(/-/g, '')
}

type Props = { event: EventSchedule; title: string }

export function AddToCalendar({ event, title }: Props) {
  const [downloaded, setDownloaded] = useState(false)

  const schedule = useMemo(() => {
    const range = eventDateRange(event)
    if (!range) return null
    const timed = eventUtcStamps(event)
    const firstDayAfterEnd = dayStamp(nextDayStamp(dayStamp(range.end)))
    return {
      timed,
      google: timed ? `${timed.start}/${timed.end}` : `${dayStamp(range.start)}/${firstDayAfterEnd}`,
      start: timed ? timed.start : dayStamp(range.start),
      end: timed ? timed.end : firstDayAfterEnd,
    }
  }, [event])

  if (!schedule) return null

  const location = formatEventPlace(event)
  const when = [formatEventDates(event), formatEventTimes(event)].filter(Boolean).join(', ')
  const details = `Film Expo India — ${when}. Where stories take shape. filmexpoindia.com`
  const googleHref = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${schedule.google}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(eventMapQuery(event))}`

  const downloadIcs = () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Film Expo India//Event//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${schedule.start}-${Date.now()}@filmexpoindia.com`,
      `DTSTAMP:${stamp}`,
      schedule.timed ? `DTSTART:${schedule.start}` : `DTSTART;VALUE=DATE:${schedule.start}`,
      schedule.timed ? `DTEND:${schedule.end}` : `DTEND;VALUE=DATE:${schedule.end}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `LOCATION:${escapeIcsText(location)}`,
      `DESCRIPTION:${escapeIcsText(details)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'film-expo-india.ics'
    link.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 2500)
  }

  return (
    <div className="add-to-calendar">
      <a href={directionsHref} target="_blank" rel="noreferrer" aria-label={`Get directions to ${location}`}><Navigation size={14} />Get Directions</a>
      <a href={googleHref} target="_blank" rel="noreferrer" aria-label={`Add ${title} to Google Calendar`}><CalendarPlus size={14} />Google Calendar</a>
      <button type="button" onClick={downloadIcs} aria-label={`Download ${title} calendar file`}><Download size={14} />{downloaded ? 'Saved' : '.ics file'}</button>
    </div>
  )
}
