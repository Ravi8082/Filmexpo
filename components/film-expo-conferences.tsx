'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useState } from 'react'
import { ArrowRight, CalendarDays, Menu, MapPin, Users, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { EmailEngagementForm } from '@/components/email-engagement-form'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

function safeHref(href: string) {
  if (!href || href.startsWith('#')) return ''
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:')) return href
  return ''
}

function navigationHref(label: string, href: string) {
  const normalizedLabel = label.toLowerCase()
  if (normalizedLabel === 'home') return '/'
  if (normalizedLabel === 'about') return '/about'
  if (normalizedLabel === 'exhibit' || normalizedLabel === 'exhibitors') return '/exhibitors'
  if (normalizedLabel === 'conference' || normalizedLabel === 'conferences') return '/conferences'
  return safeHref(href)
}

export function FilmExpoConferences({
  content,
  hiddenSections,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [registered, setRegistered] = useState(false)
  const programme = content.conferenceProgramme
  const activeDay = programme.schedule.days[selectedDay] ?? programme.schedule.days[0]
  const isVisible = (section: ContentSectionKey) => !hiddenSections.includes(section)

  useScrollReveal('.conference-reveal', [selectedDay])

  function moveHeroParallax(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 2}`)
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 2}`)
  }

  function resetHeroParallax(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--pointer-x', '0')
    event.currentTarget.style.setProperty('--pointer-y', '0')
  }

  function moveCardTilt(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty('--card-tilt-x', `${(x * 7).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--card-tilt-y', `${(y * -7).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--card-image-x', `${(x * -7).toFixed(2)}px`)
    event.currentTarget.style.setProperty('--card-image-y', `${(y * -7).toFixed(2)}px`)
    event.currentTarget.style.setProperty('--card-shine-x', `${((x + 0.5) * 100).toFixed(1)}%`)
    event.currentTarget.style.setProperty('--card-shine-y', `${((y + 0.5) * 100).toFixed(1)}%`)
  }

  function resetCardTilt(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--card-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--card-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--card-image-x', '0px')
    event.currentTarget.style.setProperty('--card-image-y', '0px')
    event.currentTarget.style.setProperty('--card-shine-x', '50%')
    event.currentTarget.style.setProperty('--card-shine-y', '50%')
  }

  return (
    <main className="film-site conference-page">
      <header className="site-header">
        <a hidden={!isVisible('brand')} href="" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav hidden={!isVisible('navigation')} className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={['conference', 'conferences'].includes(item.label.toLowerCase()) ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
          ))}
        </nav>
        <button hidden={!isVisible('navigation')} className="header-cta" onClick={() => setRegistered(true)}>{content.navigation.registerLabel}<ArrowRight size={14} /></button>
        <button hidden={!isVisible('navigation')} className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && isVisible('navigation') && (
        <nav className="mobile-nav about-mobile-nav" aria-label="Mobile navigation">
          {content.navigation.items.map((item, index) => (
            <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={15} /></a>
          ))}
        </nav>
      )}

      {!hiddenSections.includes('conferenceProgramme') && (
        <>
          <section id="top" className="conference-hero" onPointerMove={moveHeroParallax} onPointerLeave={resetHeroParallax}>
            <HeroMedia className="conference-hero-image" videoClassName="conference-hero-video" image={programme.hero.image || content.hero.image} video={programme.hero.video} priority />
            <div className="conference-hero-shade" />
            <div className="conference-hero-grid" aria-hidden="true" />
            <div className="conference-hero-glow conference-hero-glow-one" aria-hidden="true" />
            <div className="conference-hero-glow conference-hero-glow-two" aria-hidden="true" />
            <div className="conference-3d-stage" aria-hidden="true">
              <div className="conference-orbit conference-orbit-one"><i /></div>
              <div className="conference-orbit conference-orbit-two"><i /></div>
              <div className="conference-cube">
                <span>FILM</span><span>EXPO</span><span>INDIA</span><span>2026</span><span>LIVE</span><span>TALKS</span>
              </div>
              <div className="conference-reel"><b /><b /><b /><b /><b /><b /></div>
            </div>
            <div className="conference-hero-copy">
              <p className="about-eyebrow">{programme.hero.eyebrow}</p>
              <h1>{programme.hero.title}<br /><em>{programme.hero.highlight}</em></h1>
              <p className="conference-hero-description">{programme.hero.description}</p>
              <div className="conference-hero-meta">
                <span><CalendarDays size={16} />{programme.hero.dates}</span>
                <span><MapPin size={16} />{programme.hero.venue}</span>
              </div>
              <a className="primary-button" href={safeHref(programme.hero.buttonHref)}>{programme.hero.buttonLabel}<ArrowRight size={15} /></a>
            </div>
            <aside className="conference-hero-quote"><span>“</span>{programme.hero.sideQuote}<b>”</b></aside>
            <span className="conference-hero-status"><i /> FILM EXPO INDIA / CONFERENCE PROGRAMME</span>
            <a className="conference-hero-scroll" href="">Scroll to explore <span>↓</span></a>
          </section>

          {!programme.programmeConfirmed && (
            <aside className="conference-unconfirmed" role="status">
              <strong>Programme details are not yet confirmed.</strong>
              <span>Schedule, speaker and event details are illustrative. Please check back for the approved programme.</span>
            </aside>
          )}

          <section className="conference-metrics conference-reveal" aria-label="Conference highlights">
            {programme.metrics.map((metric, index) => (
              <div key={`${metric.label}-${index}`} onPointerMove={moveCardTilt} onPointerLeave={resetCardTilt}>
                <span className="conference-metric-icon">{metric.icon}</span>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </div>
            ))}
          </section>

          <section className="conference-schedule conference-reveal" id="schedule">
            <div className="conference-schedule-heading">
              <div>
                <p className="about-eyebrow">{programme.schedule.eyebrow}</p>
                <h2>{programme.schedule.title}</h2>
                <p>{programme.schedule.description}</p>
              </div>
              <a className="conference-download" href={safeHref(programme.schedule.downloadHref)}>{programme.schedule.downloadLabel}<ArrowRight size={14} /></a>
            </div>
            <div className="conference-day-tabs" role="tablist" aria-label="Conference days">
              {programme.schedule.days.map((day, index) => (
                <button
                  key={`${day.label}-${index}`}
                  className={selectedDay === index ? 'active' : ''}
                  role="tab"
                  aria-selected={selectedDay === index}
                  onClick={() => setSelectedDay(index)}
                >
                  <strong>{day.label}</strong><span>{day.date}</span>
                </button>
              ))}
            </div>

            <div className="conference-content-layout">
              <div className="conference-tracks">
                {activeDay?.tracks.length ? activeDay.tracks.map((track, trackIndex) => (
                  <section className="conference-track conference-reveal" key={`${track.title}-${trackIndex}`}>
                    <header className="conference-track-heading">
                      <span className="conference-track-icon">{trackIndex === 0 ? '⚑' : trackIndex === 1 ? '◉' : '♟'}</span>
                      <div><h3>{track.title}</h3><p>{track.subtitle}</p></div>
                      <a href="">View All Sessions <ArrowRight size={13} /></a>
                    </header>
                    <div className="conference-session-grid">
                      {track.sessions.map((session, sessionIndex) => (
                        <article
                          className="conference-session-card"
                          key={`${session.title}-${sessionIndex}`}
                          onPointerMove={moveCardTilt}
                          onPointerLeave={resetCardTilt}
                        >
                          <div className="conference-session-image">
                            <Image src={session.sessionImage || programme.hero.image || content.hero.image} alt="" fill sizes="(max-width: 760px) 90vw, (max-width: 1100px) 45vw, 24vw" />
                            <span>{session.time}</span>
                          </div>
                          <div className="conference-session-copy">
                            <h4>{session.title}</h4>
                            <p>{session.description}</p>
                            <div className="conference-speaker">
                              <Image src={session.image || content.hero.image} alt="" width={36} height={36} />
                              <span><strong>{session.speaker}</strong><small>{session.role}</small></span>
                              <span className="conference-session-arrow"><ArrowRight size={16} /></span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )) : (
                  <div className="conference-empty-day conference-reveal">
                    <CalendarDays size={24} />
                    <h3>Schedule coming soon</h3>
                    <p>Session details for {activeDay?.label ?? 'this day'} will be announced shortly.</p>
                  </div>
                )}
              </div>

              <aside className="conference-promos">
                {programme.promos.map((promo, index) => (
                  <article
                    className={`conference-promo conference-promo-${index + 1} conference-reveal`}
                    key={`${promo.title}-${index}`}
                    onPointerMove={moveCardTilt}
                    onPointerLeave={resetCardTilt}
                  >
                    <Image src={promo.image || programme.hero.image || content.hero.image} alt="" fill sizes="(max-width: 760px) 90vw, 24vw" />
                    <div className="conference-promo-shade" />
                    <div className="conference-promo-copy">
                      <h3>{promo.title}</h3>
                      {promo.features?.length ? <ul>{promo.features.map((feature, featureIndex) => <li key={`${feature}-${featureIndex}`}><Users size={13} />{feature}</li>)}</ul> : null}
                      <a href={safeHref(promo.href)}>{promo.buttonLabel}<ArrowRight size={13} /></a>
                    </div>
                  </article>
                ))}
              </aside>
            </div>
          </section>

          <section className="conference-closing conference-reveal" id="registration">
            <Image src={programme.closing.image || programme.hero.image || content.hero.image} alt="" fill sizes="100vw" />
            <div className="conference-closing-shade" />
            <div className="conference-closing-3d" aria-hidden="true"><i /><i /><i /></div>
            <div><h2>{programme.closing.title}</h2><p>{programme.closing.description}</p></div>
            <a className="primary-button" href={safeHref(programme.closing.buttonHref)}>{programme.closing.buttonLabel}<ArrowRight size={15} /></a>
          </section>
        </>
      )}

      {!hiddenSections.includes('footer') && (
        <footer hidden={!isVisible('footer')} className="site-footer conference-footer conference-reveal" id="contact">
          <div className="footer-main">
            <div className="footer-about">
              <a hidden={!isVisible('brand')} href="" className="wordmark"><Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} /><span>{content.brand.name}<small>{content.brand.tagline}</small></span></a>
              <p>{content.footer.description}</p>
              <div className="footer-socials">{content.footer.socialLinks.map((social, index) => <a key={`${social.label}-${index}`} href={safeHref(social.href)} aria-label={social.label}>{social.label.slice(0, 1)}</a>)}</div>
            </div>
            <div className="footer-links"><h3>{content.footer.quickLinksTitle}</h3><div>{content.navigation.items.map((item, index) => <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>)}</div></div>
            <div className="footer-contact"><h3>{content.footer.contactTitle}</h3><p><MapPin size={16} />{content.footer.venue}<br />{content.footer.location}</p><a href={`mailto:${content.footer.email}`}>✉ {content.footer.email}</a><a href={`tel:${content.footer.phone.replace(/[^\d+]/g, '')}`}>☎ {content.footer.phone}</a></div>
            <div className="footer-subscribe"><h3>{content.footer.subscribeTitle}</h3><p>{content.footer.subscribeText}</p><EmailEngagementForm type="newsletter" placeholder={content.footer.subscribePlaceholder} emailLabel={content.footer.subscribePlaceholder} buttonLabel={content.footer.subscribeButtonLabel} compact /></div>
          </div>
          <div className="footer-bottom"><span>{content.footer.copyright}</span><span><a href={safeHref(content.footer.privacyHref)}>{content.footer.privacy}</a>　|　<a href={safeHref(content.footer.termsHref)}>{content.footer.terms}</a>　|　<a href={safeHref(content.footer.refundHref)}>{content.footer.refund}</a>　|　<a href={safeHref(content.footer.sitemapHref)}>{content.footer.sitemap}</a></span></div>
        </footer>
      )}

      {registered && (
        <div className="pass-modal" role="dialog" aria-modal="true" aria-labelledby="conference-pass-title">
          <div className="modal-card">
            <button className="modal-close" aria-label="Close registration dialog" onClick={() => setRegistered(false)}><X /></button>
            <span className="eyebrow dark">{content.hero.registration.eyebrow}</span>
            <h2 id="conference-pass-title">{content.hero.registration.title}<br /><i>{content.hero.registration.highlight}</i></h2>
            <p>{content.hero.registration.description}</p>
            <EmailEngagementForm type="registration" placeholder={content.hero.registration.emailPlaceholder} emailLabel={content.hero.registration.emailLabel} buttonLabel={content.hero.registration.submitLabel} />
          </div>
        </div>
      )}
    </main>
  )
}
