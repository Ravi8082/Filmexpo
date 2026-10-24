'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { HomepageContent } from '@/lib/site-content'
import { tiltHandlers } from '@/lib/tilt'
import { EmailOtpControl } from '@/components/email-otp-control'

export function PartnerEnquiry({ partners }: { partners: HomepageContent['partners'] }) {
  const [interest, setInterest] = useState(partners.formInterests?.[0] ?? '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

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
          interest: `Partnership: ${interest}`,
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
    <>
      {partners.benefits?.length > 0 && (
        <div className="partner-block">
          <p className="eyebrow dark">{partners.benefitsEyebrow}</p>
          <h2>{partners.benefitsTitle}</h2>
          <div className="partner-benefits">
            {partners.benefits.map((benefit, index) => (
              <article key={`${benefit.title}-${index}`} className="tilt-3d" style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {partners.packages?.length > 0 && (
        <div className="partner-block">
          <p className="eyebrow dark">{partners.packagesEyebrow}</p>
          <h2>{partners.packagesTitle}</h2>
          <div className="partner-packages">
            {partners.packages.map((pack, index) => (
              <article key={`${pack.name}-${index}`} className={`tilt-3d${pack.featured ? ' featured' : ''}`} style={{ '--i': index } as React.CSSProperties} {...tiltHandlers}>
                <h3>{pack.name}</h3>
                <strong>{pack.price}</strong>
                <ul>{pack.perks.map((perk, perkIndex) => <li key={`${perk}-${perkIndex}`}><Check size={14} />{perk}</li>)}</ul>
                <button type="button" onClick={() => { setInterest(pack.name); document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth' }) }}>Choose {pack.name}</button>
              </article>
            ))}
          </div>
          {partners.packagesNote && <p className="partner-note">{partners.packagesNote}</p>}
        </div>
      )}

      <div className="partner-block partner-form-wrap" id="partner-form">
        <div className="partner-3d" aria-hidden="true"><i /><i /><i /><b><s /><s /><s /><s /><s /><s /></b></div>
        <div>
          <p className="eyebrow dark">{partners.formEyebrow}</p>
          <h2>{partners.formTitle}</h2>
          <p className="partners-intro">{partners.formText}</p>
          {partners.brochureHref && <a className="outline-button light" href={partners.brochureHref} target="_blank" rel="noreferrer">{partners.brochureLabel}</a>}
        </div>
        <form className="partner-form" onSubmit={submit}>
          <input name="name" required maxLength={120} placeholder="Your name" aria-label="Your name" />
          <input name="company" required maxLength={180} placeholder="Company" aria-label="Company" />
          <EmailOtpControl label="" placeholder="Email" ariaLabel="Email" />
          <input name="phone" required maxLength={40} placeholder="Phone" aria-label="Phone" />
          <select value={interest} onChange={(event) => setInterest(event.target.value)} aria-label="Partnership interest">
            {(partners.formInterests ?? []).map((option) => <option key={option}>{option}</option>)}
          </select>
          <textarea name="message" maxLength={3000} rows={3} placeholder="Message (optional)" aria-label="Message" />
          <button className="primary-button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : partners.formButton}<ArrowRight size={15} /></button>
          {status === 'done' && <p className="partner-status ok">{partners.formSuccess}</p>}
          {status === 'error' && <p className="partner-status err">Something went wrong. Please check the details and try again.</p>}
        </form>
      </div>
    </>
  )
}
