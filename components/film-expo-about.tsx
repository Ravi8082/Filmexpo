'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, Clock, MapPin, Menu, Navigation, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { eventMapQuery, formatEventDates, formatEventPlace, formatEventTimes } from '@/lib/event-schedule'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

function safeHref(href: string) {
  if (!href || href.startsWith('#')) return ''
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:')) return href
  return ''
}

function navigationHref(label: string, href: string) {
  if (label.toLowerCase() === 'home') return '/'
  if (label.toLowerCase() === 'about') return '/about'
  if (label.toLowerCase() === 'exhibit' || label.toLowerCase() === 'exhibitors') return '/exhibitors'
  if (label.toLowerCase() === 'conference' || label.toLowerCase() === 'conferences') return '/conferences'
  return safeHref(href)
}

function Split({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <span className="gp-split" aria-label={text}>
      {text.split(' ').map((word, index) => (
        <span className="gp-word" aria-hidden="true" key={`${word}-${index}`}>
          <span style={{ ['--w' as string]: index + start }}>{word}&nbsp;</span>
        </span>
      ))}
    </span>
  )
}

export function FilmExpoAbout({
  content,
  hiddenSections,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [galleryStart, setGalleryStart] = useState(0)
  const about = content.aboutPage
  const visible = (section: ContentSectionKey) => !hiddenSections.includes(section)
  const galleryItems = about.gallery.items.filter((item) => activeFilter === 'All' || item.category === activeFilter)
  const visibleGalleryItems = galleryItems.length > 4
    ? Array.from({ length: 4 }, (_, index) => galleryItems[(galleryStart + index) % galleryItems.length])
    : galleryItems

  useScrollReveal('.about-reveal')

  function changeFilter(filter: string) {
    setActiveFilter(filter)
    setGalleryStart(0)
  }

  function shiftGallery(direction: number) {
    if (galleryItems.length < 2) return
    setGalleryStart((current) => (current + direction + galleryItems.length) % galleryItems.length)
  }

  return (
    <main className="film-site about-page">
      <header className="site-header about-header">
        <a href="/" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={item.label.toLowerCase() === 'about' ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
          ))}
        </nav>
        <a className="header-cta" href="/?register=1">{content.navigation.registerLabel}<ArrowRight size={14} /></a>
        <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && (
        <nav className="mobile-nav about-mobile-nav" aria-label="Mobile navigation">
          {content.navigation.items.map((item, index) => (
            <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={15} /></a>
          ))}
        </nav>
      )}

      <section hidden={!visible('aboutPage')} className="about-hero">
        <HeroMedia className="about-hero-image" videoClassName="about-hero-video" image={about.hero.image} video={about.hero.video} priority />
        <div className="about-hero-shade" />
        <div className="about-hero-content">
          <p className="about-eyebrow">{about.hero.eyebrow}</p>
          <h1 className="about-hero-title">
            <span className="hero-title-line">{about.hero.title}</span>
            <span className="hero-title-line hero-title-highlight"><em>{about.hero.highlight}</em></span>
          </h1>
          <p className="about-hero-description">{about.hero.description}</p>
          <div className="about-actions">
            <a className="primary-button" href="">{about.hero.primaryCta}<ArrowRight size={16} /></a>
            <a className="outline-button" href="">{about.hero.secondaryCta}</a>
          </div>
        </div>
        <a href="" className="about-scroll-cue">Explore our story <ChevronDown size={15} /></a>
        <span className="about-hero-index">01 — 03</span>
      </section>

      <section hidden={!visible('aboutPage')} id="about-story" className="about-story about-reveal">
        <div className="about-story-copy">
          <p className="about-eyebrow">{about.story.eyebrow}</p>
          <h2><Split text={about.story.title} /></h2>
          {about.story.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)}
          <a className="primary-button" href="">{about.story.button}<ArrowRight size={15} /></a>
        </div>
        <div className="about-story-image-wrap">
          <Image src={about.story.image} alt="Film Expo India production and filmmaking" fill sizes="(max-width: 800px) 100vw, 30vw" />
          <span>FILM EXPO INDIA</span>
        </div>
        <article className="about-profile-card">
          <div className={`about-profile-image${about.story.profile.image.endsWith('/vindu-dara-singh.webp') ? ' mentor-profile-image' : ''}`}>
            <Image src={about.story.profile.image} alt={about.story.profile.name} fill sizes="(max-width: 800px) 50vw, 18vw" />
          </div>
          <h3>{about.story.profile.name}</h3>
          <p>{about.story.profile.role}</p>
          <blockquote>{about.story.profile.quote}</blockquote>
        </article>
      </section>

      <section hidden={!visible('aboutPage')} id="about-impact" className="about-impact about-reveal">
        <div className="about-section-heading">
          <p className="about-eyebrow">{about.impact.eyebrow}</p>
          <h2><Split text={about.impact.title} /></h2>
          <p>{about.impact.description}</p>
        </div>
        <div className="about-impact-primary">
          {about.impact.metrics.slice(0, 4).map((metric, index) => (
            <article className="about-metric about-metric-primary" key={`${metric.label}-${index}`}>
              <span className="about-metric-icon">{metric.icon}</span><strong>{metric.value}</strong><p>{metric.label}</p>
            </article>
          ))}
        </div>
        <div className="about-impact-secondary">
          {about.impact.metrics.slice(4).map((metric, index) => (
            <article className="about-metric" key={`${metric.label}-${index + 4}`}>
              <span className="about-metric-icon">{metric.icon}</span><strong>{metric.value}</strong><p>{metric.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section hidden={!visible('aboutPage')} className="about-events about-reveal">
        <div className="about-events-heading">
          <div>
            <p className="about-eyebrow">{about.events.eyebrow}</p>
            <h2><Split text={about.events.title} /></h2>
            <p>{about.events.description}</p>
          </div>
          <a className="primary-button" href="">{about.events.button}<ArrowRight size={15} /></a>
        </div>
        <div className="about-event-grid">
          {about.events.items.map((event, index) => (
            <article className="about-event-card" key={`${event.season}-${event.date}-${index}`}>
              <div className="about-event-image">
                <Image src={event.image} alt={`${event.venue} event venue`} fill sizes="(max-width: 800px) 100vw, 45vw" />
                <div className="about-event-badges"><span>{event.season}</span>{event.badge && <span>{event.badge}</span>}</div>
                <span className="about-event-year">{event.year}</span>
              </div>
              <div className="about-event-details">
                <h3>{formatEventDates(event)}</h3>
                {formatEventTimes(event) && <p className="about-event-time"><Clock size={14} />{formatEventTimes(event)}</p>}
                <p><MapPin size={14} />{formatEventPlace(event)}</p>
                <small>{event.hall}</small>
                <a className="primary-button" href={safeHref(event.href)}>{event.button}<ArrowRight size={14} /></a>
                <div className="add-to-calendar"><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(eventMapQuery(event))}`} target="_blank" rel="noreferrer"><Navigation size={14} />Get Directions</a></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section hidden={!visible('aboutPage')} className="about-gallery about-reveal">
        <div className="about-gallery-heading">
          <div><p className="about-eyebrow">{about.gallery.eyebrow}</p><h2><Split text={about.gallery.title} /></h2></div>
          <div className="about-gallery-filters" role="group" aria-label="Filter gallery">
            {about.gallery.filters.map((filter) => (
              <button className={activeFilter === filter ? 'active' : ''} key={filter} onClick={() => changeFilter(filter)}>{filter}</button>
            ))}
          </div>
        </div>
        <div className="about-gallery-grid">
          {visibleGalleryItems.map((item, index) => (
            <figure key={`${item.category}-${item.alt}-${index}`}>
              <Image src={item.image} alt={item.alt} fill sizes="(max-width: 800px) 48vw, 24vw" />
              <figcaption>{item.category}</figcaption>
            </figure>
          ))}
          {visibleGalleryItems.length === 0 && <p className="about-gallery-empty">Add images in Superadmin to fill this gallery.</p>}
        </div>
        {galleryItems.length > 4 && (
          <div className="about-gallery-arrows">
            <button aria-label="Previous gallery images" onClick={() => shiftGallery(-1)}><ArrowLeft size={17} /></button>
            <button aria-label="Next gallery images" onClick={() => shiftGallery(1)}><ArrowRight size={17} /></button>
          </div>
        )}
      </section>

      <section hidden={!visible('aboutPage')} className="about-closing about-reveal">
        <Image src={about.closing.image} alt="" fill sizes="100vw" />
        <div className="about-closing-shade" />
        <div><h2><Split text={about.closing.title} /></h2><p className="gp-fade">{about.closing.description}</p><a className="primary-button" href={safeHref(about.closing.href)}>{about.closing.button}<ArrowRight size={15} /></a></div>
      </section>

      <footer hidden={!visible('footer')} id="contact" className="site-footer about-footer gp-footer about-reveal">
        <div className="footer-main">
          <div className="footer-about">
            <a href="/" className="wordmark"><Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} /><span>{content.brand.name}<small>{content.brand.tagline}</small></span></a>
            <p>{content.footer.description}</p>
            <div className="footer-socials">{content.footer.socialLinks.map((social, index) => <a key={`${social.label}-${index}`} href={safeHref(social.href)} aria-label={social.label}>{social.label.slice(0, 1)}</a>)}</div>
          </div>
          <div className="footer-links"><h3><Split text={content.footer.quickLinksTitle} /></h3><div>{content.navigation.items.map((item, index) => <a key={`${item.label}-${index}`} style={{ ['--w' as string]: index }} href={navigationHref(item.label, item.href)}>{item.label}</a>)}</div></div>
          <div className="footer-contact"><h3><Split text={content.footer.contactTitle} /></h3><p><MapPin size={16} />{content.footer.venue}<br />{content.footer.location}</p><a href={`mailto:${content.footer.email}`}>✉ {content.footer.email}</a><a href={`tel:${content.footer.phone.replace(/[^\d+]/g, '')}`}>☎ {content.footer.phone}</a></div>
          <div className="footer-subscribe"><h3><Split text={content.footer.subscribeTitle} /></h3><p>{content.footer.subscribeText}</p><a className="about-footer-contact" href={`mailto:${content.footer.email}`}>Get in touch <ArrowRight size={14} /></a></div>
        </div>
        <div className="footer-bottom"><span>{content.footer.copyright}</span><span><a href={safeHref(content.footer.privacyHref)}>{content.footer.privacy}</a>　|　<a href={safeHref(content.footer.termsHref)}>{content.footer.terms}</a>　|　<a href={safeHref(content.footer.refundHref)}>{content.footer.refund}</a>　|　<a href={safeHref(content.footer.sitemapHref)}>{content.footer.sitemap}</a></span></div>
      </footer>
    </main>
  )
}
