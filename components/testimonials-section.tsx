'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star, Volume2, VolumeX } from 'lucide-react'
import type { HomepageContent } from '@/lib/site-content'
import { SectionHead } from '@/components/home-section'

const IMAGE_SLIDE_MS = 7000

export function TestimonialsSection({ testimonials, hidden }: { testimonials: HomepageContent['testimonials']; hidden?: boolean }) {
  const items = testimonials.items
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(false)
  const [pointerInside, setPointerInside] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const current = items[active]

  const next = useCallback(() => setActive((value) => (value + 1) % Math.max(items.length, 1)), [items.length])
  const prev = () => setActive((value) => (value - 1 + items.length) % items.length)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Videos advance when they end; slides without video advance on a timer.
  useEffect(() => {
    if (!inView || !current || current.video) return
    const timer = window.setTimeout(next, IMAGE_SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [active, inView, current, next])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!inView && !pointerInside) {
      video.pause()
      return
    }
    video.muted = muted
    video.play().catch(() => {
      if (!video.muted) {
        video.muted = true
        setMuted(true)
        video.play().catch((error: unknown) => {
          console.error('Unable to play testimonial video.', error)
        })
      } else {
        console.error('Unable to play testimonial video.', new Error('The browser blocked muted autoplay.'))
      }
    })
  }, [active, inView, pointerInside]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const rail = railRef.current
    const thumb = rail?.children[active] as HTMLElement | undefined
    if (rail && thumb) rail.scrollTo({ left: thumb.offsetLeft - (rail.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' })
  }, [active])

  if (!current) return null

  return (
    <section
      ref={sectionRef}
      hidden={hidden}
      id="testimonials"
      className="home-section home-section--ink testimonials-section reveal-on-scroll"
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
    >
      <div className="tm-glow" aria-hidden="true" />
      <div className="section-inner">
      <SectionHead index={10} eyebrow={testimonials.eyebrow} title={testimonials.title} description={testimonials.description} />

      <div className="tm-stage" key={active}>
        <div className="tm-stage-media">
          {current.video ? (
            <video ref={videoRef} src={current.video} poster={current.poster || undefined} playsInline onEnded={next} onError={next} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.poster || current.photo} alt="" />
          )}
          {current.video && (
            <button type="button" className="tm-sound" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              <span>{muted ? 'Tap for sound' : 'Sound on'}</span>
            </button>
          )}
          {!current.video && <span className="tm-progress" style={{ animationDuration: `${IMAGE_SLIDE_MS}ms` }} />}
        </div>
        <div className="tm-stage-copy">
          <Quote className="tm-quote-icon" size={40} />
          <div className="tm-stars" aria-label={`${current.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={20} fill={n <= Number(current.rating) ? 'currentColor' : 'none'} />)}
          </div>
          <p>{current.quote}</p>
          <div className="tm-person">
            {current.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.photo} alt="" />
            )}
            <div><strong>{current.name}</strong><small>{[current.role, current.company].filter(Boolean).join(' · ')}</small></div>
          </div>
          <div className="tm-controls">
            <button type="button" onClick={prev} aria-label="Previous review"><ChevronLeft /></button>
            <span>{String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
            <button type="button" onClick={next} aria-label="Next review"><ChevronRight /></button>
          </div>
        </div>
      </div>

      <div className="tm-rail" ref={railRef}>
        {items.map((item, index) => (
          <button type="button" key={`${item.name}-${index}`} className={`tm-thumb${index === active ? ' is-active' : ''}`} onClick={() => setActive(index)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.poster || item.photo} alt="" />
            <span><strong>{item.name}</strong><small>{item.role}</small></span>
          </button>
        ))}
      </div>
      </div>
    </section>
  )
}
