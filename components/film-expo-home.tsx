'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronDown,
  Clapperboard,
  Clock,
  Film,
  Handshake,
  MapPin,
  Menu,
  Mic2,
  Play,
  Search,
  Users,
  X,
} from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { AddToCalendar } from '@/components/add-to-calendar'
import { formatEventDates, formatEventPlace, formatEventTimes } from '@/lib/event-schedule'
import { tiltHandlers } from '@/lib/tilt'
import { PartnerEnquiry } from '@/components/partner-enquiry'
import { PathwaysSection } from '@/components/pathways-section'
import { SpeakersSection } from '@/components/speakers-section'
import { PastEventsSection } from '@/components/past-events-section'
import { TestimonialsSection } from '@/components/testimonials-section'
import { HomeSection, SectionHead } from '@/components/home-section'
import { EmailEngagementForm } from '@/components/email-engagement-form'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

const sectionIcons = {
  visitors: Users,
  exhibitors: Clapperboard,
  brands: Camera,
  partners: Handshake,
}

const featureIcons = {
  exhibit: Clapperboard,
  visit: Users,
  'film-submission': Film,
  sponsorship: Handshake,
  conference: Mic2,
}

function featureHref(id: string) {
  const links: Record<string, string> = {
    exhibit: '/exhibitors',
    visit: '/contact',
    'film-submission': '/contact',
    sponsorship: '/partners',
    conference: '/conferences',
  }
  return links[id] ?? '/contact'
}

function safeHref(href: string) {
  if (!href || href.startsWith('#')) return ''
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:')) return href
  return ''
}

function isRegistrationAction(label: string) {
  return /\bregister(?:ed|ing)?\b|\bregistration\b/i.test(label)
}

function navigationHref(label: string, href: string) {
  if (isRegistrationAction(label)) return '/?register=1'
  if (label.toLowerCase() === 'home') return '/'
  if (label.toLowerCase() === 'about') return '/about'
  if (['exhibit', 'exhibition', 'exhibitions', 'exhibitors'].includes(label.toLowerCase())) return '/exhibitors'
  if (label.toLowerCase() === 'conference' || label.toLowerCase() === 'conferences') return '/conferences'
  if (label.toLowerCase() === 'speaker' || label.toLowerCase() === 'speakers') return '/speakers'
  if (label.toLowerCase() === 'search') return '/search'
  if (['ticket', 'tickets', 'pass', 'passes', 'buy pass', 'book pass', 'book a pass', 'pricing'].includes(label.toLowerCase())) return '/tickets'
  return safeHref(href)
}

export function FilmExpoHome({ content, hiddenSections }: { content: HomepageContent; hiddenSections: ContentSectionKey[] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [registered, setRegistered] = useState(false)
  const isVisible = (section: ContentSectionKey) => !hiddenSections.includes(section)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('register') === '1') setRegistered(true)
  }, [])

  useScrollReveal('.reveal-on-scroll')

  useEffect(() => {
    let previousScrollY = window.scrollY
    let scrollDirection: 'up' | 'down' = 'down'
    let directionChangeY = previousScrollY
    let directionChangePending = false
    const replayPathways = () => {
      const pathways = document.querySelector<HTMLElement>('.pathways-section')
      if (!pathways?.classList.contains('is-visible')) return
      const bounds = pathways.getBoundingClientRect()
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return

      pathways.dataset.scrollDirection = scrollDirection
      pathways.dataset.revealEdge = scrollDirection === 'up' ? 'above' : 'below'
      pathways.dataset.revealPhase = 'enter'
      pathways.classList.remove('is-visible')
      void pathways.offsetWidth
      requestAnimationFrame(() => {
        if (pathways.isConnected && pathways.dataset.revealPhase === 'enter') {
          pathways.classList.add('is-visible')
        }
      })
    }
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY === previousScrollY) return

      const nextDirection = currentScrollY < previousScrollY ? 'up' : 'down'
      const scrollDelta = currentScrollY - previousScrollY
      previousScrollY = currentScrollY
      if (nextDirection !== scrollDirection) {
        scrollDirection = nextDirection
        directionChangeY = currentScrollY
        directionChangePending = true
        if (Math.abs(scrollDelta) >= 24) {
          replayPathways()
          directionChangePending = false
        }
        return
      }

      if (!directionChangePending || Math.abs(currentScrollY - directionChangeY) < 24) return
      replayPathways()
      directionChangePending = false
    }
    window.addEventListener('scroll', updateScrollDirection, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollDirection)
  }, [])

  const handleHeroMove = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    event.currentTarget.style.setProperty('--pointer-x', `${x}`)
    event.currentTarget.style.setProperty('--pointer-y', `${y}`)
  }

  const resetHeroMotion = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--pointer-x', '0')
    event.currentTarget.style.setProperty('--pointer-y', '0')
  }

  return (
    <main className="film-site">
      <header className="site-header">
        <a hidden={!isVisible('brand')} href="" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav hidden={!isVisible('navigation')} className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a
              className={item.label.toLowerCase() === 'home' ? 'active' : ''}
              key={`${item.label}-${index}`}
              href={isRegistrationAction(item.label) ? '/?register=1' : navigationHref(item.label, item.href)}
              onClick={isRegistrationAction(item.label) ? (event) => { event.preventDefault(); setRegistered(true) } : undefined}
            >{item.label}</a>
          ))}
        </nav>
        <a hidden={!isVisible('navigation')} className="header-search" href="/search" aria-label="Search the site"><Search size={16} /></a>
        <a hidden={!isVisible('navigation')} className="header-cta" href={navigationHref('Book a Pass', '/tickets')}>{content.ticketing.ctaLabel || content.navigation.registerLabel} <ArrowRight size={14} /></a>
        <button hidden={!isVisible('navigation')} className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && isVisible('navigation') && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {content.navigation.items.map((item, index) => (
            <a
              key={`${item.label}-${index}`}
              href={isRegistrationAction(item.label) ? '/?register=1' : navigationHref(item.label, item.href)}
              onClick={(event) => {
                setMenuOpen(false)
                if (isRegistrationAction(item.label)) {
                  event.preventDefault()
                  setRegistered(true)
                }
              }}
            >{item.label}<ArrowRight size={15} /></a>
          ))}
          <a className="mobile-search-cta" href="/search" onClick={() => setMenuOpen(false)}><Search size={15} /> Search</a>
          <a className="primary-button mobile-register-cta" href={navigationHref('Book a Pass', '/tickets')} onClick={() => setMenuOpen(false)}>{content.ticketing.ctaLabel || content.navigation.registerLabel} <ArrowRight size={15} /></a>
        </nav>
      )}

      <section hidden={!isVisible('hero')} id="top" className="hero-section" onPointerMove={handleHeroMove} onPointerLeave={resetHeroMotion}>
        <div className="hero-video-wrap" aria-hidden="true">
          {content.hero.video ? (
            <video className="hero-video" autoPlay muted loop playsInline poster={content.hero.image}>
              <source src={content.hero.video} />
            </video>
          ) : (
            <Image className="hero-video" src={content.hero.image} alt="" fill loading="eager" sizes="100vw" />
          )}
          <div className="video-vignette" />
          <div className="video-scanlines" />
          <div className="video-status"><span className="live-dot" /> {content.hero.videoStatus}</div>
        </div>
        <div className="hero-gradient" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow reveal-on-scroll">{content.hero.eyebrow}</p>
          <h1 className="hero-title reveal-on-scroll">
            <span className="hero-title-line">{content.hero.title}</span>
            <span className="hero-title-line hero-title-highlight"><em>{content.hero.highlight}</em></span>
          </h1>
          <p className="hero-copy reveal-on-scroll">{content.hero.description}</p>
          <div className="hero-meta reveal-on-scroll">
            <span><CalendarDays />{content.hero.dates}<small>{content.hero.dateLabel}</small></span>
            <span><MapPin />{content.hero.venue}<small>{content.hero.location}</small></span>
          </div>
          <div className="hero-actions reveal-on-scroll">
            <button className="primary-button" onClick={() => setRegistered(true)}>{content.hero.primaryCta} <ArrowRight size={16} /></button>
            <button className="outline-button" onClick={() => setRegistered(true)}>{content.hero.secondaryCta}</button>
          </div>
        </div>
        <a className="trailer-button reveal-on-scroll" href="/gallery"><span><Play size={16} fill="currentColor" /></span>{content.hero.trailerLabel}</a>
        <a href="" className="scroll-cue reveal-on-scroll"><span>{content.hero.scrollLabel}</span><ChevronDown size={16} /></a>
      </section>

      <PathwaysSection pathways={content.pathways} hidden={!isVisible('pathways')} onRegister={() => setRegistered(true)} />

      <HomeSection id="about" tone="navy" hidden={!isVisible('homeAbout')}>
        <SectionHead
          index={2}
          eyebrow={content.homeAbout.eyebrow}
          title={content.homeAbout.title}
          description={content.homeAbout.paragraph}
          action={{ label: content.homeAbout.buttonLabel, href: safeHref(content.homeAbout.buttonHref) }}
        />
        <div className="home-about-media">
          <div className="home-about-image">
            <Image src={content.homeAbout.image || content.hero.image} alt="" fill sizes="(max-width: 900px) 100vw, 60vw" />
          </div>
          <article className="home-about-profile">
            <div className={content.homeAbout.profile.image.endsWith('/vindu-dara-singh.webp') ? 'mentor-profile-image' : undefined}>
              <Image src={content.homeAbout.profile.image || content.hero.image} alt={content.homeAbout.profile.name} fill sizes="(max-width: 900px) 40vw, 22vw" />
            </div>
            <h3>{content.homeAbout.profile.name}</h3>
            <p>{content.homeAbout.profile.role}</p>
            <blockquote>{content.homeAbout.profile.quote}</blockquote>
          </article>
        </div>
      </HomeSection>

      <HomeSection tone="ink" hidden={!isVisible('stats')} className="impact-section" aria-label={content.stats.ariaLabel}>
        <SectionHead index={3} eyebrow={content.stats.eyebrow} title={content.stats.title} description={content.stats.description} align="center" />
        <div className="impact-cards">
          {content.stats.items.map((stat, index) => {
            const Icon = sectionIcons[stat.icon as keyof typeof sectionIcons] || Users
            return <div className="impact-card" key={`${stat.label}-${index}`}><Icon /><strong>{stat.value}</strong><span>{stat.label}</span></div>
          })}
        </div>
      </HomeSection>

      <HomeSection tone="ink" hidden={!isVisible('features')} className="feature-band">
        <SectionHead index={4} eyebrow={content.features.eyebrow} title={content.features.title} description={content.features.description} />
        <div className="feature-grid">
          {content.features.items.map((card, index) => {
            const Icon = featureIcons[card.id as keyof typeof featureIcons] ?? Clapperboard
            return (
              <a className="feature-card" id={card.id} href={featureHref(card.id)} key={`${card.title}-${index}`} style={{ '--i': index } as React.CSSProperties}>
                <Image className="feature-image" src={card.image || content.hero.image} alt="" fill sizes="(max-width: 760px) 80vw, (max-width: 1100px) 45vw, 20vw" />
                <div className="feature-overlay" />
                <div className="feature-copy">
                  <span className="feature-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                  <ArrowRight className="feature-arrow" size={18} aria-hidden="true" />
                </div>
              </a>
            )
          })}
        </div>
      </HomeSection>

      <HomeSection id="events" tone="paper" hidden={!isVisible('event')} className="upcoming-section">
        <SectionHead
          index={5}
          eyebrow={content.event.eyebrow}
          title={content.event.title}
          description={content.event.description}
          action={{ label: content.event.buttonLabel, href: safeHref(content.event.buttonHref) }}
        />
        <div className="upcoming-grid">
          {content.event.items.map((item, index) => (
            <article className="upcoming-card" key={`${item.season}-${item.date}-${index}`}>
              <div className="upcoming-image">
                <Image src={item.image || content.hero.image} alt="" fill sizes="(max-width: 900px) 100vw, 45vw" />
                <div className="upcoming-badges"><span>{item.season}</span>{item.badge && <span>{item.badge}</span>}</div>
                <span className="upcoming-year">{item.year}</span>
              </div>
              <div className="upcoming-details">
                {item.confirmationNote && <small className="upcoming-draft-note">{item.confirmationNote}</small>}
                <h3>{formatEventDates(item)}</h3>
                {formatEventTimes(item) && <p className="upcoming-time"><Clock size={15} />{formatEventTimes(item)}</p>}
                <p><MapPin size={15} />{formatEventPlace(item)}</p><small>{item.hall}</small>
                {isRegistrationAction(item.buttonLabel)
                  ? <button type="button" className="primary-button" onClick={() => setRegistered(true)}>{item.buttonLabel}<ArrowRight size={15} /></button>
                  : <a className="primary-button" href={safeHref(item.href)}>{item.buttonLabel}<ArrowRight size={15} /></a>}
                <AddToCalendar event={item} title={`Film Expo India ${item.year}`} />
              </div>
            </article>
          ))}
        </div>
      </HomeSection>

      <HomeSection
        id="highlights"
        tone="ink"
        hidden={!isVisible('highlights')}
        className="highlights"
        bleed={<>
          <Image className="highlights-background" src={content.highlights.image || content.hero.image} alt="" fill sizes="100vw" />
          <div className="highlights-overlay" aria-hidden="true" />
        </>}
      >
        <SectionHead index={6} eyebrow={content.highlights.eyebrow} title={content.highlights.title} />
        <div className="highlight-list">
          {content.highlights.items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="hl-card tilt-3d" style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}>
              <span>{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p>
            </div>
          ))}
        </div>
      </HomeSection>

      <HomeSection tone="cream" hidden={!isVisible('categories')} className="categories">
        <SectionHead
          index={7}
          eyebrow={content.categories.eyebrow}
          title={content.categories.title}
          action={{ label: content.categories.buttonLabel, href: safeHref(content.categories.buttonHref) }}
        />
        <div className="category-row">
          {content.categories.items.map((item, index) => (
            <article key={`${item.title}-${index}`} className={`category-cell category-${index % 6}`}>
              <Image className="category-image" src={item.image || content.hero.image} alt="" fill sizes="(max-width: 900px) 45vw, 30vw" />
              <span>{item.title}<small>{item.text}</small></span>
            </article>
          ))}
        </div>
      </HomeSection>

      <SpeakersSection hidden={!isVisible('speakers')} speakers={content.speakers} fallbackImage={content.hero.image} />

      <PastEventsSection hidden={!isVisible('pastEvents')} pastEvents={content.pastEvents} />

      <TestimonialsSection hidden={!isVisible('testimonials')} testimonials={content.testimonials} />

      <HomeSection id="partners" tone="paper" hidden={!isVisible('partners')} className="partners-section">
        <SectionHead
          index={11}
          eyebrow={content.partners.eyebrow}
          title={content.partners.title}
          description={content.partners.description}
          action={{ label: content.partners.buttonLabel, href: safeHref(content.partners.buttonHref) }}
        />
        <div className="partners-who">
          {[{ title: content.partners.currentTitle, list: content.partners.current }, { title: content.partners.futureTitle, list: content.partners.future }].map((group) => group.list?.length ? (
            <div className="partners-who-card tilt-3d" key={group.title} {...tiltHandlers}>
              <h3>{group.title}</h3>
              <ul>{group.list.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
          ) : null)}
        </div>
        <div className="partner-marquee" aria-label="Our partners">
          {[false, true].map((reverse) => (
            <div className={`partner-track${reverse ? ' reverse' : ''}`} key={reverse ? 'reverse' : 'forward'}>
              {[0, 1].map((copy) => (
                <div className="partner-track-set" key={copy} aria-hidden={copy ? true : undefined}>
                  {content.partners.items.map((partner, index) => (
                    <div key={`${partner.name}-${index}`} className="partner-logo tilt-3d" title={partner.name} {...tiltHandlers}>
                      {partner.logo ? <Image src={partner.logo} alt={copy ? '' : partner.name} fill sizes="300px" /> : <span>{partner.name}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <PartnerEnquiry partners={content.partners} />
      </HomeSection>

      <HomeSection id="media" tone="ink" hidden={!isVisible('gallery')} className="gallery-section">
        <SectionHead
          index={12}
          eyebrow={content.gallery.eyebrow}
          title={content.gallery.title}
          action={{ label: content.gallery.buttonLabel, href: safeHref(content.gallery.buttonHref) }}
        />
        <div className="gallery-grid">
          {content.gallery.items.map((item, index) => (
            <figure className="tilt-3d" key={`${item.alt}-${index}`} style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}><Image src={item.image || content.hero.image} alt={item.alt} fill sizes="(max-width: 900px) 45vw, 25vw" /></figure>
          ))}
        </div>
      </HomeSection>

      <HomeSection id="news" tone="paper" hidden={!isVisible('news')} className="news-section">
        <SectionHead
          index={13}
          eyebrow={content.news.eyebrow}
          title={content.news.title}
          action={{ label: content.news.buttonLabel, href: safeHref(content.news.buttonHref) }}
        />
        <div className="news-grid">
          {content.news.items.map((item, index) => (
            <article className="news-card tilt-3d" key={`${item.title}-${index}`} style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}>
              <a href={safeHref(item.href)} className="news-image"><Image src={item.image || content.hero.image} alt="" fill sizes="(max-width: 900px) 100vw, 30vw" /></a>
              <div className="news-body"><span className="news-category">{item.category}</span><h3><a href={safeHref(item.href)}>{item.title}</a></h3><a className="news-read-more" href={safeHref(item.href)}>Read More <ArrowRight size={14} /></a></div>
            </article>
          ))}
        </div>
      </HomeSection>

      <HomeSection
        tone="ink"
        hidden={!isVisible('closing')}
        className="closing"
        inner="full"
        bleed={<Image className="closing-image" src={content.closing.image || content.hero.image} alt="" fill sizes="100vw" />}
      >
        <div className="closing-content"><h2>{content.closing.title}<br /><i>{content.closing.highlight}</i></h2>{isRegistrationAction(content.closing.button)
          ? <button type="button" className="primary-button" onClick={() => setRegistered(true)}>{content.closing.button}<ArrowRight size={16} /></button>
          : <a className="primary-button" href={safeHref(content.closing.buttonHref)}>{content.closing.button}<ArrowRight size={16} /></a>}</div>
      </HomeSection>

      <footer hidden={!isVisible('footer')} id="contact" className="site-footer reveal-on-scroll">
        <div className="section-inner">
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
        </div>
      </footer>

      {registered && (
        <div className="pass-modal" role="dialog" aria-modal="true" aria-labelledby="pass-title">
          <div className="modal-card">
            <button className="modal-close" aria-label="Close registration dialog" onClick={() => setRegistered(false)}><X /></button>
            <span className="eyebrow dark">{content.hero.registration.eyebrow}</span>
            <h2 id="pass-title">{content.hero.registration.title}<br /><i>{content.hero.registration.highlight}</i></h2>
            <p>{content.hero.registration.description}</p>
            <EmailEngagementForm type="registration" placeholder={content.hero.registration.emailPlaceholder} emailLabel={content.hero.registration.emailLabel} buttonLabel={content.hero.registration.submitLabel} />
          </div>
        </div>
      )}
    </main>
  )
}
