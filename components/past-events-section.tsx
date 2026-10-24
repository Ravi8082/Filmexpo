'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Play, Volume2, X } from 'lucide-react'
import type { HomepageContent } from '@/lib/site-content'
import { SectionHead } from '@/components/home-section'

type Item = HomepageContent['pastEvents']['items'][number]

function EventCard({ item, onOpen, decorative }: { item: Item; onOpen: (item: Item) => void; decorative?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)

  // Only the cards on screen play, so a long strip of videos stays light.
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => undefined)
      else video.pause()
    }, { threshold: 0.3 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <button type="button" className="pe-card" onClick={() => onOpen(item)} tabIndex={decorative ? -1 : 0} aria-label={`Watch ${item.title}`}>
      {item.video ? (
        <video ref={ref} src={item.video} poster={item.poster || undefined} muted loop playsInline preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.poster} alt="" />
      )}
      <span className="pe-shade" aria-hidden="true" />
      {item.video && <span className="pe-play"><Play size={20} fill="currentColor" /></span>}
      <span className="pe-meta">
        <small>{[item.date, item.location].filter(Boolean).join(' · ')}</small>
        <strong>{item.title}</strong>
      </span>
    </button>
  )
}

export function PastEventsSection({ pastEvents, hidden }: { pastEvents: HomepageContent['pastEvents']; hidden?: boolean }) {
  const [open, setOpen] = useState<Item | null>(null)
  const items = pastEvents.items
  if (!items.length) return null

  const rowA = items

  return (
    <section hidden={hidden} id="past-events" className="home-section home-section--paper home-section--flush pastevents-section reveal-on-scroll">
      <div className="section-inner">
        <SectionHead index={9} eyebrow={pastEvents.eyebrow} title={pastEvents.title} description={pastEvents.description} />
      </div>

      <div className="pe-marquee">
        <div className="pe-track">
          {[0, 1].map((copy) => (
            <div className="pe-set" key={copy} aria-hidden={copy ? true : undefined}>
              {rowA.map((item, index) => <EventCard key={`${item.title}-${index}`} item={item} onOpen={setOpen} decorative={!!copy} />)}
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="tm-modal" role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpen(null)}>
          <div className="tm-modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="tm-close" aria-label="Close" onClick={() => setOpen(null)}><X /></button>
            {open.video ? (
              <video src={open.video} poster={open.poster || undefined} controls autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.poster} alt={open.title} style={{ width: '100%', display: 'block' }} />
            )}
            <div className="tm-modal-meta">
              <strong>{open.title}</strong>
              <span><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />{[open.date, open.location].filter(Boolean).join(' · ')}</span>
              {open.video && <span style={{ marginLeft: 14 }}><Volume2 size={13} style={{ display: 'inline', marginRight: 4 }} />Sound on</span>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
