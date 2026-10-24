'use client'

import { useEffect, useState } from 'react'
import type { HomepageContent } from '@/lib/site-content'
import { HomeSection, SectionHead } from '@/components/home-section'

const SLIDE_MS = 4500

export function SpeakersSection({ speakers, fallbackImage, hidden }: { speakers: HomepageContent['speakers']; fallbackImage: string; hidden?: boolean }) {
  const items = speakers.items
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (items.length < 2) return
    const timer = window.setInterval(() => setActive((value) => (value + 1) % items.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [items.length])

  const current = items[active]
  if (!current) return null

  return (
    <HomeSection
      id="speakers"
      tone="ink"
      hidden={hidden}
      className="speakers-section sp-section"
      bleed={<div className="sp-beams" aria-hidden="true"><i /><i /><i /></div>}
    >
      <SectionHead
        index={8}
        eyebrow={speakers.eyebrow}
        title={speakers.title}
        action={{ label: speakers.buttonLabel, href: speakers.buttonHref }}
      />

      <div className="spx-panels">
        {items.map((speaker, index) => {
          const isActive = index === active
          return (
            <button type="button" key={`${speaker.name}-${index}`} className={`spx-panel${isActive ? ' is-active' : ''}`} onClick={() => setActive(index)} aria-label={`Show ${speaker.name}`} aria-pressed={isActive}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={speaker.image || fallbackImage} alt={speaker.name} />
              <span className="spx-shade" aria-hidden="true" />
              <span className="spx-side">{speaker.name}</span>
              <span className="spx-detail">
                <em>{String(index + 1).padStart(2, '0')}</em>
                <strong>{speaker.name}</strong>
                <b>{speaker.role}</b>
                <small>{speaker.organization}</small>
              </span>
              {isActive && <span className="spx-bar" key={active} style={{ animationDuration: `${SLIDE_MS}ms` }} />}
            </button>
          )
        })}
      </div>
    </HomeSection>
  )
}
