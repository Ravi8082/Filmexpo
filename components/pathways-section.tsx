'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Handshake, Store, Ticket } from 'lucide-react'
import type { HomepageContent } from '@/lib/site-content'
import { tiltHandlers } from '@/lib/tilt'
import { HomeSection, SectionHead } from '@/components/home-section'

const icons = { ticket: Ticket, booth: Store, handshake: Handshake }

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const end = new Date(target).getTime()
  if (now === null || Number.isNaN(end)) return null
  const diff = Math.max(0, end - now)
  return [
    ['Days', Math.floor(diff / 86_400_000)],
    ['Hours', Math.floor(diff / 3_600_000) % 24],
    ['Mins', Math.floor(diff / 60_000) % 60],
    ['Secs', Math.floor(diff / 1000) % 60],
  ] as const
}

function safeHref(href: string) {
  return href.startsWith('#') || href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:') ? href : '/'
}

export function PathwaysSection({
  pathways,
  hidden,
  onRegister,
}: {
  pathways: HomepageContent['pathways']
  hidden?: boolean
  onRegister?: () => void
}) {
  const countdown = useCountdown(pathways.countdownTarget)

  return (
    <HomeSection tone="cream" className="pathways-section" hidden={hidden}>
      <div className="pathways-info">
        <div className="pathways-info-items">
          {pathways.infoItems.map((item, index) => (
            <div key={`${item.label}-${index}`}><small>{item.label}</small><strong>{item.value}</strong></div>
          ))}
        </div>
        {countdown && (
          <div className="pathways-countdown" aria-label={pathways.countdownLabel}>
            <small>{pathways.countdownLabel}</small>
            <div>{countdown.map(([label, value]) => <span key={label}><b>{String(value).padStart(2, '0')}</b>{label}</span>)}</div>
          </div>
        )}
      </div>

      <SectionHead index={1} eyebrow={pathways.eyebrow} title={pathways.title} description={pathways.description} align="center" />

      <div className="pathways-grid">
        {pathways.cards.map((card, index) => {
          const Icon = icons[card.icon as keyof typeof icons] || Ticket
          return (
            <article key={`${card.role}-${index}`} className="pathway-card tilt-3d" style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}>
              <span className="pathway-icon"><Icon size={22} /></span>
              <small>{card.role}</small>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <ul>{card.points.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}</ul>
              {onRegister && /\bregister(?:ed|ing)?\b|\bregistration\b/i.test(card.buttonLabel)
                ? <button type="button" className="primary-button" onClick={onRegister}>{card.buttonLabel}<ArrowRight size={15} /></button>
                : <a className="primary-button" href={safeHref(card.href)}>{card.buttonLabel}<ArrowRight size={15} /></a>}
            </article>
          )
        })}
      </div>
    </HomeSection>
  )
}
