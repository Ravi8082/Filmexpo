'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useState } from 'react'
import { ArrowRight, Home, Mail, MapPin, Menu, Phone, Send, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { tiltHandlers } from '@/lib/tilt'
import { EmailOtpControl } from '@/components/email-otp-control'
import { EmailEngagementForm } from '@/components/email-engagement-form'
import { useScrollReveal } from '@/lib/use-scroll-reveal'

function safeHref(href: string) {
  if (!href || href.startsWith('#')) return ''
  if (href.startsWith('/') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) return href
  return ''
}

function navigationHref(label: string, href: string) {
  const normalized = label.toLowerCase()
  if (normalized === 'home') return '/'
  if (normalized === 'about') return '/about'
  if (normalized === 'exhibit' || normalized === 'exhibitors') return '/exhibitors'
  if (normalized === 'conference' || normalized === 'conferences') return '/conferences'
  if (normalized === 'gallery') return '/gallery'
  if (normalized === 'blog' || normalized === 'blogs') return '/blog'
  if (normalized === 'contact') return '/contact'
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

const icons = { phone: Phone, map: MapPin, mail: Mail } as const

export function FilmExpoContact({
  content,
  hiddenSections,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}) {
  const page = content.contactPage
  const isVisible = (section: ContentSectionKey) => !hiddenSections.includes(section)
  const [menuOpen, setMenuOpen] = useState(false)
  const [interest, setInterest] = useState(page.form.interests[0] ?? '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  useScrollReveal('.gp-reveal')

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    try {
      const response = await fetch('/api/exhibitor-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          company: data.get('company'),
          interest: `Contact: ${interest}`,
          message: data.get('message'),
        }),
      })
      if (!response.ok) throw new Error('failed')
      form.reset()
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="film-site gallery-page contact-page">
      <header className="site-header">
        <a hidden={!isVisible('brand')} href="/" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav hidden={!isVisible('navigation')} className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={item.label.toLowerCase() === 'contact' ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
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
            <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={16} /></a>
          ))}
        </nav>
      )}

      <section className="gp-hero cp-hero" onPointerMove={moveHero} onPointerLeave={resetHero}>
        <HeroMedia className="gp-hero-image" videoClassName="gp-hero-video" image={page.hero.image} video={page.hero.video} priority />
        <div className="gp-hero-shade" />
        <div className="gp-hero-grid" aria-hidden="true" />
        <div className="gp-3d" aria-hidden="true">
          <div className="gp-reel gp-reel-left"><b /><b /><b /><b /><b /><b /></div>
          <div className="gp-reel gp-reel-right"><b /><b /><b /><b /><b /><b /></div>
          <div className="gp-film-strip"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <span className="cp-spot cp-spot-a" /><span className="cp-spot cp-spot-b" />
        </div>
        <div className="gp-hero-copy">
          <p className="eyebrow gp-eyebrow">{page.hero.eyebrow}</p>
          <h1 className="gp-hero-title">
            <span className="hero-title-line">{page.hero.title}</span>
            <span className="hero-title-line hero-title-highlight"><em>{page.hero.highlight}</em></span>
          </h1>
          <h2 className="cp-subtitle"><Split text={page.hero.subtitle} start={2} /></h2>
          <p className="bp-hero-desc">{page.hero.description}</p>
          <div className="cp-info">
            {page.infoCards.map((card, index) => {
              const Icon = icons[card.icon as keyof typeof icons] ?? Phone
              const inner = (
                <>
                  <i><Icon size={20} /></i>
                  <span><strong>{card.title}</strong>{card.lines.map((line) => <small key={line}>{line}</small>)}</span>
                </>
              )
              return card.href
                ? <a key={`${card.title}-${index}`} className="cp-info-card tilt-3d" {...tiltHandlers} href={safeHref(card.href)} style={{ ['--i' as string]: index } as React.CSSProperties}>{inner}</a>
                : <div key={`${card.title}-${index}`} className="cp-info-card tilt-3d" {...tiltHandlers} style={{ ['--i' as string]: index } as React.CSSProperties}>{inner}</div>
            })}
          </div>
          <a className="primary-button cp-home" href="/"><Home size={15} />{page.hero.homeLabel}<ArrowRight size={15} /></a>
        </div>
      </section>

      <section className="cp-categories">
        <div className="bp-heading gp-reveal">
          <p className="eyebrow dark gp-eyebrow">{page.categoriesSection.eyebrow}</p>
          <h2><Split text={page.categoriesSection.title} /><em className="gp-shine"><Split text={page.categoriesSection.highlight} start={3} /></em></h2>
          <span className="cp-divider" aria-hidden="true"><i /></span>
          <p className="cp-lead">{page.categoriesSection.description}</p>
        </div>
        <div className="cp-grid">
          {page.categories.map((item, index) => (
            <article key={`${item.number}-${index}`} className="cp-card tilt-3d gp-reveal" {...tiltHandlers} style={{ ['--i' as string]: index % 3 } as React.CSSProperties}>
              <div className="cp-card-media">
                {item.image && <Image src={item.image} alt="" fill sizes="(max-width: 800px) 90vw, 30vw" unoptimized={item.image.endsWith('.svg')} />}
                <b className="cp-num">{item.number}</b>
              </div>
              <div className="cp-card-copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <a className="cp-btn" href={safeHref(item.buttonHref)}>{item.buttonLabel}<ArrowRight size={14} /></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-form-section gp-reveal" id="contact-form">
        <div className="cp-form-intro">
          <p className="eyebrow dark gp-eyebrow">{page.form.eyebrow}</p>
          <h2><Split text={page.form.title} /><em className="gp-shine"><Split text={page.form.highlight} start={3} /></em></h2>
          <p>{page.form.description}</p>
          <div className="cp-orbit" aria-hidden="true"><span className="cp-orbit-core"><Mail size={30} /></span><i /><i /><i /></div>
        </div>
        <form className="cp-form" onSubmit={submit}>
          <input name="name" required maxLength={120} placeholder="Your name" aria-label="Your name" />
          <input name="company" required maxLength={180} placeholder="Company" aria-label="Company" />
          <EmailOtpControl label="" placeholder="Email" ariaLabel="Email" />
          <input name="phone" required maxLength={40} placeholder="Phone" aria-label="Phone" />
          <select value={interest} onChange={(event) => setInterest(event.target.value)} aria-label="Enquiry type">
            {page.form.interests.map((option) => <option key={option}>{option}</option>)}
          </select>
          <textarea name="message" maxLength={3000} rows={4} placeholder="Your message" aria-label="Message" />
          <button type="submit" className="primary-button" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : page.form.buttonLabel}<Send size={15} /></button>
          {status === 'done' && <p className="cp-note ok" role="status">{page.form.successMessage}</p>}
          {status === 'error' && <p className="cp-note err" role="alert">{page.form.errorMessage}</p>}
        </form>
      </section>

      <section className="cp-quote gp-reveal">
        {page.quote.image && <Image src={page.quote.image} alt="" fill sizes="100vw" unoptimized={page.quote.image.endsWith('.svg')} />}
        <div className="gp-closing-shade" />
        <div className="cp-quote-inner">
          <blockquote><span aria-hidden="true">“</span><Split text={page.quote.text} /></blockquote>
          <a className="primary-button" href={safeHref(page.quote.buttonHref)}>{page.quote.buttonLabel}<ArrowRight size={15} /></a>
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
    </main>
  )
}
