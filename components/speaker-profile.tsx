'use client'

import { ArrowLeft } from 'lucide-react'
import { useScrollReveal } from '@/lib/use-scroll-reveal'
import { useTilt } from '@/lib/use-tilt'
import type { HomepageContent } from '@/lib/site-content'
import type { Speaker } from '@/lib/speakers'

type PageCopy = HomepageContent['speakersPage']

function safeExternal(url: string) {
  return /^https?:\/\//i.test(url) ? url : ''
}

export function SpeakerProfile({ speaker, page, brandName }: { speaker: Speaker; page: PageCopy; brandName: string }) {
  useScrollReveal('.fx-reveal', [speaker.slug])
  useTilt('[data-tilt]', [speaker.slug])
  const socials = speaker.socials?.filter((social) => safeExternal(social.url)) ?? []
  const session = speaker.session

  return (
    <main className="speakers-page speaker-profile">
      <article className="speakers-shell">
        <a className="speakers-back fx-reveal" href="/speakers"><ArrowLeft size={14} /> All speakers</a>

        <header className="spk-profile-hero fx-reveal fx-tilt" data-tilt>
          <span className="spk-profile-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={speaker.image} alt={speaker.name} />
          </span>
          <div className="spk-profile-title">
            <p className="legal-eyebrow">{brandName}</p>
            <h1 className="fx-shine">{speaker.name}</h1>
            <p className="spk-role">{speaker.role}</p>
            {speaker.organization && <p className="spk-org">{speaker.organization}</p>}
          </div>
        </header>

        {speaker.bio && (
          <section className="spk-block fx-reveal">
            <h2>{page.bioLabel}</h2>
            <p>{speaker.bio}</p>
          </section>
        )}

        {session?.title && (
          <section className="spk-block fx-reveal">
            <h2>{page.sessionLabel}</h2>
            <p className="spk-session-title">{session.title}</p>
            <dl className="spk-session-meta">
              {session.time && <div><dt>{page.timeLabel}</dt><dd>{session.time}</dd></div>}
              {session.venue && <div><dt>{page.venueLabel}</dt><dd>{session.venue}</dd></div>}
            </dl>
          </section>
        )}

        {socials.length > 0 && (
          <section className="spk-block fx-reveal">
            <h2>{page.socialsLabel}</h2>
            <div className="spk-socials">
              {socials.map((social, index) => (
                <a key={`${social.label}-${index}`} href={safeExternal(social.url)} target="_blank" rel="noreferrer noopener">{social.label}</a>
              ))}
            </div>
          </section>
        )}

        {page.disclaimer && <p className="speakers-disclaimer fx-reveal">{page.disclaimer}</p>}
      </article>
    </main>
  )
}
