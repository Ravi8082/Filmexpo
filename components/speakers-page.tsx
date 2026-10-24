'use client'

import { ArrowLeft } from 'lucide-react'
import { useScrollReveal } from '@/lib/use-scroll-reveal'
import { useTilt } from '@/lib/use-tilt'
import type { HomepageContent } from '@/lib/site-content'
import { speakerSlug } from '@/lib/speakers'

type PageCopy = HomepageContent['speakersPage']

export function SpeakersPage({ content, page }: { content: HomepageContent; page: PageCopy }) {
  const speakers = content.speakers.items
  const fallback = content.hero.image
  useScrollReveal('.fx-reveal', [speakers.length])
  useTilt('[data-tilt]', [speakers.length])

  return (
    <main className="speakers-page">
      <article className="speakers-shell">
        <a className="speakers-back fx-reveal" href="/"><ArrowLeft size={14} /> Back to home</a>

        <header className="speakers-hero fx-reveal">
          <p className="legal-eyebrow">{page.eyebrow}</p>
          <h1>{page.title} <em className="fx-shine">{page.highlight}</em></h1>
          <p className="speakers-intro">{page.description}</p>
        </header>

        <section className="speakers-list">
          <div className="speakers-list-head fx-reveal">
            <p className="legal-eyebrow">{page.listEyebrow}</p>
            <h2>{page.listTitle}</h2>
          </div>

          <div className="speaker-tile-grid">
            {speakers.map((speaker, index) => {
              const slug = speakerSlug(speaker, index)
              return (
                <a
                  key={`${slug}-${index}`}
                  className="speaker-tile fx-reveal fx-tilt"
                  data-tilt
                  style={{ ['--fx-i' as string]: index + 1 }}
                  href={`/speakers/${encodeURIComponent(slug)}`}
                >
                  <span className="speaker-tile-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={speaker.image || fallback} alt={speaker.name} />
                  </span>
                  <span className="speaker-tile-body">
                    <strong>{speaker.name}</strong>
                    <b>{speaker.role}</b>
                    <small>{speaker.organization}</small>
                    {speaker.session?.title && <span className="speaker-tile-session">{speaker.session.title}</span>}
                    <span className="speaker-tile-cta">{page.profileCtaLabel} <ArrowLeft size={13} /></span>
                  </span>
                </a>
              )
            })}
          </div>

          {page.disclaimer && <p className="speakers-disclaimer fx-reveal">{page.disclaimer}</p>}
        </section>
      </article>
    </main>
  )
}
