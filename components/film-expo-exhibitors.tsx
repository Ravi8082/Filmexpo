'use client'

import Image from 'next/image'
import { HeroMedia } from '@/components/hero-media'
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import type { ContentSectionKey, HomepageContent } from '@/lib/site-content'
import { EmailOtpControl } from '@/components/email-otp-control'
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

export function FilmExpoExhibitors({
  content,
  hiddenSections,
}: {
  content: HomepageContent
  hiddenSections: ContentSectionKey[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [enquiryError, setEnquiryError] = useState('')
  const section = content.exhibitReasons
  const visible = !hiddenSections.includes('exhibitReasons')
  const footerVisible = !hiddenSections.includes('footer')

  useScrollReveal('.exhibitors-reveal')

  async function submitEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setEnquiryStatus('sending')
    setEnquiryError('')

    try {
      const formData = new FormData(form)
      const response = await fetch('/api/exhibitor-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      })
      const body: unknown = await response.json()
      if (!response.ok || !body || typeof body !== 'object' || !('success' in body)) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not send your enquiry. Please try again.'
        throw new Error(message)
      }
      form.reset()
      setEnquiryStatus('success')
    } catch (submitError) {
      setEnquiryStatus('error')
      setEnquiryError(submitError instanceof Error ? submitError.message : 'Could not send your enquiry. Please try again.')
    }
  }

  return (
    <main className="film-site about-page exhibitors-page">
      <header className="site-header about-header">
        <a href="/" className="wordmark" aria-label={`${content.brand.name} home`}>
          <Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} />
          <span>{content.brand.name}<small>{content.brand.tagline}</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {content.navigation.items.map((item, index) => (
            <a className={['exhibitor', 'exhibitors'].includes(item.label.toLowerCase()) ? 'active' : ''} key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>
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

      {visible && (
        <>
          <section id="exhibitors" className="exhibitors-hero exhibitors-reveal">
            <HeroMedia className="exhibitors-hero-image" videoClassName="exhibitors-hero-video" image={section.image || content.hero.image} video={section.video} priority />
            <div className="exhibitors-hero-shade" />
            <div className="exhibitors-hero-content">
              <p className="about-eyebrow">{section.eyebrow}</p>
              <h1>{section.title}</h1>
              <p>{section.description}</p>
              <a className="primary-button" href={safeHref(section.buttonHref)}>{section.buttonLabel}<ArrowRight size={16} /></a>
            </div>
            <span className="exhibitors-hero-index">FILM EXPO INDIA / EXHIBITORS</span>
          </section>

          <section className="exhibitors-overview exhibitors-reveal">
            <div className="exhibitors-editorial-heading">
              <p className="about-eyebrow">{section.ecosystem.eyebrow}</p>
              <h2>{section.ecosystem.title}</h2>
              <p>{section.ecosystem.description}</p>
            </div>
            <div className="exhibitors-ecosystem-grid">
              {section.ecosystem.items.map((item, index) => (
                <article key={`${item.title}-${index}`}><span>{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p></article>
              ))}
            </div>
          </section>

          <section className="exhibitors-edition exhibitors-reveal">
            <div className="exhibitors-edition-heading">
              <p className="about-eyebrow">{section.edition2026.eyebrow}</p>
              <h2>{section.edition2026.title}</h2>
              <p>{section.edition2026.description}</p>
            </div>
            <h3>{section.edition2026.impactTitle}</h3>
            <div className="exhibitors-edition-metrics">
              {section.edition2026.metrics.map((metric, index) => (
                <article key={`${metric.label}-${index}`}><strong>{metric.value}</strong><span>{metric.label}</span></article>
              ))}
            </div>
            <div className="exhibitors-experience">
              <div><h3>{section.edition2026.experienceTitle}</h3><p>{section.edition2026.experienceDescription}</p></div>
              <div className="exhibitors-experience-metrics">
                {section.edition2026.experienceItems.map((item, index) => (
                  <article key={`${item.label}-${index}`}><strong>{item.value}</strong><span>{item.label}</span></article>
                ))}
              </div>
            </div>
            <div className="exhibitors-journey">
              <div><p className="about-eyebrow">{section.edition2026.journeyTitle}</p><h3>{section.edition2026.journeyEdition}</h3><p>{section.edition2026.journeyDescription}</p></div>
              <div><strong>{section.edition2026.journeyDate}</strong><span>{section.edition2026.journeyVenue}</span><a href="/?register=1" className="primary-button">{section.edition2026.journeyButtonLabel}<ArrowRight size={15} /></a></div>
            </div>
          </section>

          <section className="exhibitors-guests exhibitors-reveal">
            <div className="exhibitors-editorial-heading">
              <p className="about-eyebrow">{section.guestsOfHonour.eyebrow}</p>
              <h2>{section.guestsOfHonour.title}</h2>
              <p>{section.guestsOfHonour.description}</p>
            </div>
            <div className="exhibitors-guest-grid">
              {section.guestsOfHonour.items.map((guest, index) => (
                <article className="exhibitors-guest-card" key={`${guest.name}-${index}`}>
                  <div className="exhibitors-guest-image">
                    <Image src={guest.image} alt={guest.name} fill sizes="(max-width: 650px) 80vw, (max-width: 1000px) 40vw, 22vw" />
                  </div>
                  <div className="exhibitors-guest-copy"><span>{guest.role}</span><h3>{guest.name}</h3></div>
                </article>
              ))}
            </div>
          </section>

          <section className="exhibitors-international exhibitors-reveal">
            <div className="exhibitors-editorial-heading">
              <p className="about-eyebrow">{section.internationalApproach.eyebrow}</p>
              <h2>{section.internationalApproach.title}</h2>
              <p>{section.internationalApproach.description}</p>
            </div>
            <div className="exhibitors-international-grid">
              {section.internationalApproach.items.map((delegation, index) => (
                <article className="exhibitors-international-card" key={`${delegation.country}-${index}`}>
                  <div className="exhibitors-international-image">
                    <Image src={delegation.image} alt={`${delegation.country} international delegation`} fill sizes="(max-width: 650px) 80vw, (max-width: 1000px) 40vw, 18vw" />
                  </div>
                  <h3>{delegation.country}</h3>
                </article>
              ))}
            </div>
          </section>

          <section id="benefits" className="exhibitors-benefits exhibitors-reveal">
            <div className="exhibitors-benefits-heading">
              <p className="about-eyebrow">{section.benefitsEyebrow}</p>
              <h2>{section.benefitsTitle}</h2>
            </div>
            <div className="exhibitors-benefits-grid">
              {section.items.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <span>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="exhibitors-cta exhibitors-reveal">
            <div>
              <p className="about-eyebrow">JOIN THE INDUSTRY</p>
              <h2>Bring your work to the people shaping cinema.</h2>
            </div>
            <a className="primary-button" href="/?register=1">{section.buttonLabel}<ArrowRight size={16} /></a>
          </section>

          <section id="form" className="exhibitors-enquiry exhibitors-reveal">
            <div className="exhibitors-enquiry-copy">
              <p className="about-eyebrow">{section.enquiry.eyebrow}</p>
              <h2>{section.enquiry.title}</h2>
              <p>{section.enquiry.description}</p>
            </div>
            <form className="exhibitors-enquiry-form" onSubmit={submitEnquiry}>
              <label>{section.enquiry.nameLabel}<input name="name" autoComplete="name" maxLength={120} required /></label>
              <EmailOtpControl label={section.enquiry.emailLabel} />
              <label>{section.enquiry.phoneLabel}<input name="phone" type="tel" autoComplete="tel" maxLength={40} required /></label>
              <label>{section.enquiry.companyLabel}<input name="company" autoComplete="organization" maxLength={180} required /></label>
              <label className="exhibitors-enquiry-interest">{section.enquiry.interestLabel}
                <select name="interest" required defaultValue="">
                  <option value="" disabled>Select an option</option>
                  {section.enquiry.interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                </select>
              </label>
              <label className="exhibitors-enquiry-message">{section.enquiry.messageLabel}<textarea name="message" rows={4} maxLength={3000} /></label>
              <button className="primary-button" type="submit" disabled={enquiryStatus === 'sending'}>{enquiryStatus === 'sending' ? 'Sending…' : section.enquiry.submitLabel}<ArrowRight size={15} /></button>
              {enquiryStatus === 'success' && <p className="exhibitors-enquiry-success" role="status">{section.enquiry.successMessage}</p>}
              {enquiryStatus === 'error' && <p className="admin-error" role="alert">{enquiryError}</p>}
            </form>
          </section>
        </>
      )}

      <footer hidden={!footerVisible} id="contact" className="site-footer about-footer exhibitors-reveal">
        <div className="footer-main">
          <div className="footer-about">
            <a href="/" className="wordmark"><Image className="wordmark-image" src={content.brand.logo} alt="" width={36} height={36} /><span>{content.brand.name}<small>{content.brand.tagline}</small></span></a>
            <p>{content.footer.description}</p>
            <div className="footer-socials">{content.footer.socialLinks.map((social, index) => <a key={`${social.label}-${index}`} href={safeHref(social.href)} aria-label={social.label}>{social.label.slice(0, 1)}</a>)}</div>
          </div>
          <div className="footer-links"><h3>{content.footer.quickLinksTitle}</h3><div>{content.navigation.items.map((item, index) => <a key={`${item.label}-${index}`} href={navigationHref(item.label, item.href)}>{item.label}</a>)}</div></div>
          <div className="footer-contact"><h3>{content.footer.contactTitle}</h3><p>{content.footer.venue}<br />{content.footer.location}</p><a href={`mailto:${content.footer.email}`}>{content.footer.email}</a><a href={`tel:${content.footer.phone.replace(/[^\d+]/g, '')}`}>{content.footer.phone}</a></div>
          <div className="footer-subscribe"><h3>{content.footer.subscribeTitle}</h3><p>{content.footer.subscribeText}</p><a className="about-footer-contact" href={`mailto:${content.footer.email}`}>Get in touch <ArrowRight size={14} /></a></div>
        </div>
        <div className="footer-bottom"><span>{content.footer.copyright}</span><span><a href={safeHref(content.footer.privacyHref)}>{content.footer.privacy}</a>　|　<a href={safeHref(content.footer.termsHref)}>{content.footer.terms}</a>　|　<a href={safeHref(content.footer.refundHref)}>{content.footer.refund}</a>　|　<a href={safeHref(content.footer.sitemapHref)}>{content.footer.sitemap}</a></span></div>
      </footer>
    </main>
  )
}
