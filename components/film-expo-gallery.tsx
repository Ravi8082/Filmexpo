'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Menu, MapPin, Play, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { EmailEngagementForm } from '@/components/email-engagement-form'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

type GalleryItem = HomepageContent['galleryPage']['items'][number] & { video?: string }

const PAGE_SIZE = 9

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
  if (normalizedLabel === 'gallery') return '/gallery'
  return safeHref(href)
}

function isInternalMedia(src: string) {
  return src.startsWith('/')
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

function Thumb({ item, sizes }: { item: GalleryItem; sizes: string }) {
  if (item.image && isInternalMedia(item.image)) {
    return <Image src={item.image} alt={item.title} fill sizes={sizes} unoptimized={item.image.endsWith('.svg')} />
  }
  if (item.video) return <video src={item.video} muted playsInline preload="metadata" />
  return <span className="gp-empty">No media</span>
}

export function FilmExpoGallery({
  content,
  hiddenSections,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}) {
  const page = content.galleryPage
  const items = page.items as GalleryItem[]
  const isVisible = (section: ContentSectionKey) => !hiddenSections.includes(section)

  const [menuOpen, setMenuOpen] = useState(false)
  const [era, setEra] = useState('all')
  const [category, setCategory] = useState('All')
  const [pageIndex, setPageIndex] = useState(1)
  const [paused, setPaused] = useState(false)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => items.filter((item) => (era === 'all' || item.era === era) && (category === 'All' || item.category === category)),
    [items, era, category],
  )
  const categories = useMemo(() => {
    const fromItems = Array.from(new Set(items.map((item) => item.category).filter(Boolean)))
    return ['All', ...Array.from(new Set([...page.categories, ...fromItems]))]
  }, [items, page.categories])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleItems = filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE)
  const featured = (era === 'all' ? items : items.filter((item) => item.era === era)).slice(0, 7)
  const eraCount = (key: string) => key === 'all' ? items.length : items.filter((item) => item.era === key).length

  useEffect(() => { setPageIndex(1) }, [era, category])
  useEffect(() => { setActive(0) }, [era])

  useEffect(() => {
    if (paused || featured.length < 2) return
    const timer = window.setInterval(() => setActive((value) => (value + 1) % featured.length), 4500)
    return () => window.clearInterval(timer)
  }, [paused, featured.length])

  useScrollReveal('.gp-reveal', [era, category, pageIndex])

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
      if (event.key === 'ArrowRight') setLightbox((value) => value === null ? null : (value + 1) % filtered.length)
      if (event.key === 'ArrowLeft') setLightbox((value) => value === null ? null : (value - 1 + filtered.length) % filtered.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [lightbox, filtered.length])

  function moveHero(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 2}`)
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 2}`)
  }

  function resetHero(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--pointer-x', '0')
    event.currentTarget.style.setProperty('--pointer-y', '0')
  }

  function tilt(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    const style = event.currentTarget.style
    style.setProperty('--tilt-x', `${(x * 12).toFixed(2)}deg`)
    style.setProperty('--tilt-y', `${(y * -12).toFixed(2)}deg`)
    style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`)
    style.setProperty('--shine-y', `${((y + 0.5) * 100).toFixed(1)}%`)
  }

  function untilt(event: React.PointerEvent<HTMLElement>) {
    const style = event.currentTarget.style
    style.setProperty('--tilt-x', '0deg')
    style.setProperty('--tilt-y', '0deg')
    style.setProperty('--shine-x', '50%')
    style.setProperty('--shine-y', '50%')
  }

  function goToPage(next: number) {
    setPageIndex(next)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const current = lightbox === null ? null : filtered[lightbox]

  return (
    <main className="film-site gallery-page">
      <header className="site-header">
        <a hidden={!isVisible('brand')} href="/" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav hidden={!isVisible('navigation')} className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={item.label.toLowerCase() === 'gallery' ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
          ))}
        </nav>
        <a hidden={!isVisible('navigation')} className="header-cta" href="/?register=1">{content.navigation.registerLabel}<ArrowRight size={14} /></a>
        <button hidden={!isVisible('navigation')} className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && isVisible('navigation') && (
        <nav className="mobile-nav about-mobile-nav gp-mobile-nav" aria-label="Mobile navigation">
          {content.navigation.items.map((item, index) => (
            <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={15} /></a>
          ))}
        </nav>
      )}

      <section className="gp-hero" onPointerMove={moveHero} onPointerLeave={resetHero}>
        <HeroMedia className="gp-hero-image" videoClassName="gp-hero-video" image={page.hero.image} video={page.hero.video} priority />
        <div className="gp-hero-shade" />
        <div className="gp-hero-grid" aria-hidden="true" />
        <div className="gp-3d" aria-hidden="true">
          <div className="gp-reel gp-reel-left"><b /><b /><b /><b /><b /><b /></div>
          <div className="gp-reel gp-reel-right"><b /><b /><b /><b /><b /><b /></div>
          <div className="gp-film-strip"><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
        <div className="gp-hero-copy">
          <p className="eyebrow gp-eyebrow">{page.hero.eyebrow}</p>
          <h1 className="gp-hero-title">
            <span className="hero-title-line">{page.hero.title}</span>
            <span className="hero-title-line hero-title-highlight"><em>{page.hero.highlight}</em></span>
          </h1>
          <p className="gp-breadcrumb"><a href="/">Home</a> <span>›</span> {page.hero.breadcrumb}</p>
        </div>
      </section>

      <section className="gp-intro gp-reveal">
        <p className="eyebrow dark gp-eyebrow">{page.intro.eyebrow}</p>
        <h2><Split text={page.intro.title} /><em className="gp-shine"><Split text={page.intro.highlight} start={4} /></em></h2>
        <p className="gp-fade">{page.intro.description}</p>
      </section>

      <section className="gp-eras gp-reveal" aria-label="Past, present and future">
        {page.eras.map((item) => (
          <button
            key={item.key}
            className={`gp-era gp-era-${item.key} ${era === item.key ? 'active' : ''}`}
            onClick={() => { setEra(item.key); setCategory('All') }}
            onPointerMove={tilt}
            onPointerLeave={untilt}
          >
            <span className="gp-era-count">{eraCount(item.key)}</span>
            <strong>{item.label}</strong>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </section>

      {featured.length > 0 && (
        <section className="gp-band gp-reveal">
          <div className="gp-heading">
            <p className="eyebrow gp-eyebrow">{page.sections.stageEyebrow}</p>
            <h2><Split text={page.sections.stageTitle} /><em className="gp-shine"><Split text={page.sections.stageHighlight} start={3} /></em></h2>
          </div>
          <div className="gp-stage" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-label="Featured moments">
          <div className="gp-coverflow">
            {featured.map((item, index) => {
              const half = featured.length / 2
              let offset = index - active
              if (offset > half) offset -= featured.length
              if (offset < -half) offset += featured.length
              const abs = Math.abs(offset)
              return (
                <figure
                  key={`${item.title}-${index}`}
                  className={`gp-slide ${offset === 0 ? 'is-active' : ''}`}
                  style={{
                    transform: `translateX(${offset * 58}%) translateZ(${-abs * 140}px) rotateY(${offset * -38}deg) scale(${1 - abs * 0.06})`,
                    zIndex: 20 - abs,
                    opacity: abs > 2 ? 0 : 1 - abs * 0.22,
                    pointerEvents: abs > 2 ? 'none' : 'auto',
                  }}
                  onClick={() => {
                    if (offset !== 0) { setActive(index); return }
                    const target = filtered.indexOf(item)
                    setLightbox(target >= 0 ? target : null)
                  }}
                >
                  <Thumb item={item} sizes="(max-width: 760px) 80vw, 560px" />
                  {item.video && <span className="gp-play"><Play size={22} /></span>}
                  <figcaption>
                    <em className={`gp-pill gp-${item.era}`}>{item.era}</em>
                    <strong>{item.title}</strong>
                    <small>{item.date}</small>
                  </figcaption>
                </figure>
              )
            })}
          </div>
          <button className="gp-nav gp-prev" aria-label="Previous" onClick={() => setActive((active - 1 + featured.length) % featured.length)}><ChevronLeft /></button>
          <button className="gp-nav gp-next" aria-label="Next" onClick={() => setActive((active + 1) % featured.length)}><ChevronRight /></button>
          <div className="gp-dots">
            {featured.map((_, index) => <button key={index} aria-label={`Slide ${index + 1}`} className={index === active ? 'active' : ''} onClick={() => setActive(index)} />)}
          </div>
          </div>
        </section>
      )}

      <section className="gp-browse" ref={gridRef}>
        <div className="gp-heading gp-reveal">
          <p className="eyebrow dark gp-eyebrow">{page.sections.browseEyebrow}</p>
          <h2><Split text={page.sections.browseTitle} /><em className="gp-shine"><Split text={page.sections.browseHighlight} start={2} /></em></h2>
        </div>
        <div className="gp-chips gp-reveal" role="tablist" aria-label="Categories">
          {categories.map((name) => (
            <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </div>

        {visibleItems.length ? (
          <div className="gp-grid" key={`${era}-${category}-${pageIndex}`}>
            {visibleItems.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className="gp-card gp-reveal"
                style={{ ['--i' as string]: index }}
                onPointerMove={tilt}
                onPointerLeave={untilt}
                onClick={() => setLightbox((pageIndex - 1) * PAGE_SIZE + index)}
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter') setLightbox((pageIndex - 1) * PAGE_SIZE + index) }}
              >
                <div className="gp-card-media">
                  <Thumb item={item} sizes="(max-width: 760px) 90vw, 30vw" />
                  {item.video && <span className="gp-play"><Play size={20} /></span>}
                  <em className={`gp-pill gp-${item.era}`}>{item.era}</em>
                </div>
                <div className="gp-card-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <span><b>{item.category}</b><small>{item.date}</small></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="gp-none">No gallery items in this view yet.</p>
        )}

        {totalPages > 1 && (
          <nav className="gp-pagination" aria-label="Gallery pages">
            <button aria-label="Previous page" disabled={pageIndex === 1} onClick={() => goToPage(pageIndex - 1)}><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button key={index} className={pageIndex === index + 1 ? 'active' : ''} onClick={() => goToPage(index + 1)}>{index + 1}</button>
            ))}
            <button aria-label="Next page" disabled={pageIndex === totalPages} onClick={() => goToPage(pageIndex + 1)}><ChevronRight size={16} /></button>
          </nav>
        )}
      </section>

      <section className="gp-closing gp-reveal">
        {page.closing.image && <Image src={page.closing.image} alt="" fill sizes="100vw" unoptimized={page.closing.image.endsWith('.svg')} />}
        <div className="gp-closing-shade" />
        <div className="gp-closing-card">
          <h2><Split text={page.closing.title} /></h2>
          <p className="gp-fade">{page.closing.description}</p>
          <a className="primary-button" href={safeHref(page.closing.buttonHref)}>{page.closing.buttonLabel}<ArrowRight size={15} /></a>
        </div>
      </section>

      {isVisible('footer') && (
        <footer className="site-footer conference-footer gp-footer gp-reveal" id="contact">
          <div className="footer-main">
            <div className="footer-about">
              <a hidden={!isVisible('brand')} href="/" className="wordmark"><Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} /><span>{content.brand.name}<small>{content.brand.tagline}</small></span></a>
              <p>{content.footer.description}</p>
              <div className="footer-socials">{content.footer.socialLinks.map((social, index) => <a key={`${social.label}-${index}`} href={safeHref(social.href)} aria-label={social.label}>{social.label.slice(0, 1)}</a>)}</div>
            </div>
            <div className="footer-links"><h3><Split text={content.footer.quickLinksTitle} /></h3><div>{content.navigation.items.map((item, index) => <a key={`${item.label}-${index}`} style={{ ['--w' as string]: index }} href={navigationHref(item.label, item.href)}>{item.label}</a>)}</div></div>
            <div className="footer-contact"><h3><Split text={content.footer.contactTitle} /></h3><p><MapPin size={16} />{content.footer.venue}<br />{content.footer.location}</p><a href={`mailto:${content.footer.email}`}>✉ {content.footer.email}</a><a href={`tel:${content.footer.phone.replace(/[^\d+]/g, '')}`}>☎ {content.footer.phone}</a></div>
            <div className="footer-subscribe"><h3><Split text={content.footer.subscribeTitle} /></h3><p>{content.footer.subscribeText}</p><EmailEngagementForm type="newsletter" placeholder={content.footer.subscribePlaceholder} emailLabel={content.footer.subscribePlaceholder} buttonLabel={content.footer.subscribeButtonLabel} compact /></div>
          </div>
          <div className="footer-bottom"><span>{content.footer.copyright}</span><span><a href={safeHref(content.footer.privacyHref)}>{content.footer.privacy}</a>　|　<a href={safeHref(content.footer.termsHref)}>{content.footer.terms}</a>　|　<a href={safeHref(content.footer.refundHref)}>{content.footer.refund}</a>　|　<a href={safeHref(content.footer.sitemapHref)}>{content.footer.sitemap}</a></span></div>
        </footer>
      )}

      {current && (
        <div className="gp-lightbox" role="dialog" aria-modal="true" aria-label={current.title} onClick={() => setLightbox(null)}>
          <button className="gp-lb-close" aria-label="Close" onClick={() => setLightbox(null)}><X /></button>
          {filtered.length > 1 && <button className="gp-lb-nav gp-lb-prev" aria-label="Previous" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox! - 1 + filtered.length) % filtered.length) }}><ChevronLeft /></button>}
          <div className="gp-lb-body" onClick={(event) => event.stopPropagation()} key={lightbox}>
            <div className="gp-lb-media">
              {current.video
                ? <video src={current.video} poster={current.image || undefined} controls autoPlay playsInline />
                : current.image && <img src={current.image} alt={current.title} />}
            </div>
            <div className="gp-lb-caption">
              <em className={`gp-pill gp-${current.era}`}>{current.era}</em>
              <strong>{current.title}</strong>
              <p>{current.description}</p>
              <small>{current.category} · {current.date}</small>
            </div>
          </div>
          {filtered.length > 1 && <button className="gp-lb-nav gp-lb-next" aria-label="Next" onClick={(event) => { event.stopPropagation(); setLightbox((lightbox! + 1) % filtered.length) }}><ChevronRight /></button>}
        </div>
      )}
    </main>
  )
}
