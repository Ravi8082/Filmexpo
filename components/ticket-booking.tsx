'use client'

import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, ShieldCheck, Tag, Ticket } from 'lucide-react'
import type { HomepageContent } from '@/lib/site-content'

type Tier = HomepageContent['ticketing']['tiers'][number]
type Section = HomepageContent['ticketing']

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

type OfferState = { show: boolean; label: string; endsAt: number | null }

function parseDate(value?: string): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function offerState(tier: Tier, now: number): OfferState {
  const actual = tier.actualPrice ?? 0
  const start = parseDate(tier.offerStart)
  const end = parseDate(tier.offerEnd)
  const withinWindow = (start === null || now >= start) && (end === null || now < end)
  const show = Boolean(tier.showOffer) && actual > tier.price && withinWindow
  return { show, label: (tier.offerLabel ?? '').trim(), endsAt: show && end !== null ? end : null }
}

function countdown(endsAt: number, now: number) {
  const diff = Math.max(0, endsAt - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1000)
  if (diff <= 0) return 'Offer ended'
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m ${seconds}s left`
}

export function TicketBooking({ section, tiers, enabled, brandName }: {
  section: Section
  tiers: Tier[]
  enabled: boolean
  brandName: string
}) {
  const [tierId, setTierId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [eventState, setEventState] = useState(section.locations?.[0]?.state ?? '')
  const [eventCity, setEventCity] = useState(section.locations?.[0]?.cities?.[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const formRef = useRef<HTMLDivElement>(null)

  function selectTier(id: string) {
    setTierId(id)
    if (!enabled) return
    setFormOpen(true)
  }

  useEffect(() => {
    if (!formOpen) return
    const node = formRef.current
    if (!node) return
    const frame = window.requestAnimationFrame(() => node.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    return () => window.cancelAnimationFrame(frame)
  }, [formOpen, tierId])

  const anyCountdown = tiers.some((tier) => offerState(tier, now).endsAt !== null)
  useEffect(() => {
    if (!anyCountdown) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [anyCountdown])

  const tier = tiers.find((item) => item.id === tierId)
  const total = tier ? tier.price * quantity : 0
  const savings = tier ? (offerState(tier, now).show ? (tier.actualPrice - tier.price) * quantity : 0) : 0

  async function pay(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/booking/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, quantity, name, email, phone, state: eventState, city: eventCity }),
      })
      const result = await response.json() as { error?: string; orderId?: string; amount?: number; currency?: string; keyId?: string }
      if (!response.ok || !result.orderId || !result.keyId) throw new Error(result.error || 'We could not start the payment.')

      const ready = await loadRazorpay()
      if (!ready || !window.Razorpay) throw new Error('The payment window could not load. Please check your connection and try again.')

      const checkout = new window.Razorpay({
        key: result.keyId,
        order_id: result.orderId,
        amount: result.amount,
        currency: result.currency || 'INR',
        name: brandName,
        description: `${tier?.name ?? 'Pass'} × ${quantity}`,
        prefill: { name, email, contact: phone },
        theme: { color: '#c98b2b' },
        handler: async (payload: Record<string, string>) => {
          const verify = await fetch('/api/booking/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!verify.ok) {
            const fail = await verify.json().catch(() => ({})) as { error?: string }
            setError(fail.error || 'We could not confirm your payment. Your card is not charged twice; contact us if unsure.')
            return
          }
          const confirmed = await verify.json().catch(() => ({})) as { ticketRef?: string }
          if (confirmed.ticketRef) {
            window.location.href = `/booking/${encodeURIComponent(confirmed.ticketRef)}`
            return
          }
          setDone(true)
        },
      })
      checkout.open()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="booking-success" role="status">
        <ShieldCheck size={34} />
        <h3>{section.successTitle}</h3>
        <p>{section.successText}</p>
      </div>
    )
  }

  return (
    <div className="ticket-booking">
      <div className="ticket-tier-grid">
        {tiers.map((item, index) => {
          const offer = offerState(item, now)
          return (
            <button
              key={item.id}
              type="button"
              className={`ticket-tier fx-reveal fx-tilt${item.id === tierId ? ' is-selected' : ''}`}
              data-tilt
              style={{ ['--fx-i' as string]: index + 1 }}
              onClick={() => selectTier(item.id)}
              aria-pressed={item.id === tierId}
            >
              {offer.show && offer.label && <span className="ticket-tier-offer"><Tag size={11} />{offer.label}</span>}
              <span className="ticket-tier-name">{item.name}</span>
              <span className="ticket-tier-price">
                {offer.show && <s className="ticket-tier-was">₹{item.actualPrice!.toLocaleString('en-IN')}</s>}
                <span className="ticket-tier-now">₹{item.price.toLocaleString('en-IN')}</span>
              </span>
              {offer.show && offer.endsAt !== null && <span className="ticket-tier-timer">{countdown(offer.endsAt, now)}</span>}
              <span className="ticket-tier-audience">{item.audience}</span>
              <span className="ticket-tier-desc">{item.description}</span>
              <ul className="ticket-tier-perks">
                {item.perks.map((perk) => <li key={perk}><Ticket size={12} />{perk}</li>)}
              </ul>
              <span className="ticket-tier-cta">{enabled ? (item.id === tierId ? 'Selected — fill your details below' : `Book ${item.name}`) : item.name}</span>
            </button>
          )
        })}
      </div>

      {!enabled ? (
        <p className="ticket-closed-note">{section.closedNote}</p>
      ) : !formOpen || !tier ? (
        <p className="ticket-select-hint"><Ticket size={14} /> Select a pass above to open the booking form.</p>
      ) : (
        <div className="ticket-form-wrap" ref={formRef}>
        <form className="ticket-form" onSubmit={pay}>
          <h3>{section.formTitle}<span className="ticket-form-pass">{tier.name}</span></h3>
          <label>{section.nameLabel}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" /></label>
          <label>{section.emailLabel}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" /></label>
          <label>{section.phoneLabel}<input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={40} autoComplete="tel" inputMode="tel" /></label>
          {section.locations?.length ? (
            <div className="ticket-location-fields">
              <label>{section.stateLabel || 'State'}
                <select value={eventState} onChange={(e) => {
                  setEventState(e.target.value)
                  setEventCity(section.locations?.find((item) => item.state === e.target.value)?.cities?.[0] ?? '')
                }}>
                  {(section.locations || []).map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
                </select>
              </label>
              <label>{section.cityLabel || 'City'}
                <select value={eventCity} onChange={(e) => setEventCity(e.target.value)}>
                  {(section.locations?.find((item) => item.state === eventState)?.cities || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
          ) : null}
          <label>{section.quantityLabel}
            <input type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </label>
          <div className="ticket-summary">
            <span>{section.summaryLabel}: {tier?.name} × {quantity}</span>
            <strong>₹{total.toLocaleString('en-IN')}</strong>
          </div>
          {savings > 0 && <p className="ticket-savings">You save ₹{savings.toLocaleString('en-IN')} with {tier?.offerLabel?.trim() || 'this offer'}.</p>}
          {error && <p className="ticket-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy || !tier}>
            {busy ? <LoaderCircle size={15} className="spin" /> : null}
            {section.payButton}
          </button>
          <p className="ticket-secure"><ShieldCheck size={13} /> Payments are processed securely by Razorpay.</p>
        </form>
        </div>
      )}
    </div>
  )
}
