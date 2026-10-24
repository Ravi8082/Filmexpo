'use client'

import { ArrowLeft } from 'lucide-react'
import { TicketBooking } from '@/components/ticket-booking'
import { useScrollReveal } from '@/lib/use-scroll-reveal'
import { useTilt } from '@/lib/use-tilt'
import type { HomepageContent } from '@/lib/site-content'

type Section = HomepageContent['ticketing']

export function TicketsView({ section, enabled, brandName }: { section: Section; enabled: boolean; brandName: string }) {
  useScrollReveal('.fx-reveal', [section.tiers.length])
  useTilt('[data-tilt]', [section.tiers.length])

  return (
    <main className="tickets-page">
      <article className="tickets-shell">
        <header className="tickets-head fx-reveal">
          <p className="legal-eyebrow">{section.eyebrow}</p>
          <h1>{section.title} <em className="fx-shine">{section.highlight}</em></h1>
          <p className="tickets-intro">{section.description}</p>
        </header>
        <TicketBooking section={section} tiers={section.tiers} enabled={enabled} brandName={brandName} />
        <p className="ticket-note fx-reveal">{section.note}</p>
        <a className="tickets-back" href="/"><ArrowLeft size={14} /> Back to home</a>
      </article>
    </main>
  )
}
