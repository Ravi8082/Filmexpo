'use client'

import { useState } from 'react'
import { ArrowLeft, Check, LoaderCircle, Printer, ShieldCheck, Tag, Ticket, X } from 'lucide-react'
import { useScrollReveal } from '@/lib/use-scroll-reveal'
import { useTilt } from '@/lib/use-tilt'

export type LandingBooking = {
  ticketRef: string
  tierName: string
  quantity: number
  amountRupees: number
  currency: string
  buyerName: string
  buyerEmail: string
  status: 'created' | 'paid' | 'failed'
  refundStatus: 'none' | 'refunded'
  canRefund: boolean
  createdAt: string
}

function money(value: number, currency: string) {
  return `${currency === 'INR' ? '₹' : `${currency} `}${value.toLocaleString('en-IN')}`
}

export function TicketLanding({ booking, qrDataUrl, verifyUrl }: { booking: LandingBooking; qrDataUrl: string; verifyUrl: string }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [refunded, setRefunded] = useState(booking.refundStatus === 'refunded')

  useScrollReveal('.fx-reveal', [booking.ticketRef])
  useTilt('[data-tilt]', [booking.ticketRef])

  const paid = booking.status === 'paid'
  const showQr = paid && !refunded && Boolean(qrDataUrl)

  async function requestRefund() {
    setError('')
    setBusy(true)
    try {
      const response = await fetch(`/api/booking/${encodeURIComponent(booking.ticketRef)}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'We could not process your refund.')
      setRefunded(true)
      setConfirming(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="landing-page">
      <article className="landing-shell">
        <a className="landing-back fx-reveal" href="/"><ArrowLeft size={14} /> Back to home</a>

        <header className="landing-head fx-reveal">
          <p className="legal-eyebrow">{paid ? 'PAYMENT CONFIRMED' : booking.status === 'failed' ? 'PAYMENT FAILED' : 'PAYMENT PENDING'}</p>
          <h1>{paid ? 'Your pass is booked' : booking.status === 'failed' ? 'Payment failed' : 'Complete your payment'}</h1>
          <p className="landing-intro">
            {paid
              ? 'Show this QR code at the entrance to check in. A confirmation has been sent to your email.'
              : booking.status === 'failed'
                ? 'We could not confirm a payment for this booking. Your card has not been charged twice; contact us if you are unsure.'
                : 'This booking is created but not paid yet. Return to the booking page to complete payment.'}
          </p>
        </header>

        {paid && (
          <div className={`ticket-card fx-reveal fx-tilt${refunded ? ' is-refunded' : ''}`} data-tilt>
            <div className="ticket-card-top">
              <div className="ticket-card-brand">
                <span className="ticket-card-eyebrow">Film Expo India</span>
                <strong className="ticket-card-pass">{booking.tierName}</strong>
                <span className="ticket-card-qty">{booking.quantity} pass{booking.quantity > 1 ? 'es' : ''}</span>
              </div>
              <span className={`ticket-card-badge${refunded ? ' is-off' : ''}`}>
                {refunded ? <><X size={13} /> Refunded</> : <><Check size={13} /> Valid</>}
              </span>
            </div>

            <div className="ticket-card-body">
              <div className="ticket-qr-wrap">
                {showQr ? (
                  <>
                    <img className="ticket-qr" src={qrDataUrl} alt={`Ticket QR for booking ${booking.ticketRef}`} width={224} height={224} />
                    <a className="ticket-qr-link" href={verifyUrl} target="_blank" rel="noreferrer">{verifyUrl}</a>
                  </>
                ) : (
                  <div className="ticket-qr-empty"><ShieldCheck size={30} /><span>{refunded ? 'This ticket has been refunded and is no longer valid.' : 'QR appears once payment is confirmed.'}</span></div>
                )}
              </div>

              <dl className="ticket-details">
                <div><dt>Booking ID</dt><dd className="ticket-ref">{booking.ticketRef}</dd></div>
                <div><dt>Name</dt><dd>{booking.buyerName}</dd></div>
                <div><dt>Email</dt><dd>{booking.buyerEmail}</dd></div>
                <div><dt>Amount paid</dt><dd>{money(booking.amountRupees, booking.currency)}</dd></div>
                <div><dt>Booked on</dt><dd>{new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
              </dl>
            </div>

            {showQr && (
              <div className="ticket-card-actions no-print">
                <button type="button" className="outline-button" onClick={() => window.print()}><Printer size={15} /> Print / save PDF</button>
              </div>
            )}
          </div>
        )}

        {!paid && (
          <div className="landing-pending fx-reveal">
            <Ticket size={22} />
            <p><strong>{booking.tierName}</strong> · {booking.quantity} pass{booking.quantity > 1 ? 'es' : ''} · {money(booking.amountRupees, booking.currency)} · Ref {booking.ticketRef}</p>
            <a className="primary-button" href="/tickets">Go to booking page</a>
          </div>
        )}

        {paid && (
          <section className="landing-refund fx-reveal no-print">
            <h2>Need a refund?</h2>
            <p>Refunds follow our <a href="/refund">refund &amp; cancellation policy</a>. Requesting a refund cancels this pass and its QR immediately.</p>
            {refunded ? (
              <p className="refund-done" role="status"><Check size={15} /> Your refund has been processed. It usually reaches your account within 5-7 working days.</p>
            ) : confirming ? (
              <div className="refund-confirm">
                <p><strong>Are you sure?</strong> This permanently cancels <Tag size={13} /> {booking.tierName} × {booking.quantity} and refunds {money(booking.amountRupees, booking.currency)}.</p>
                <div className="refund-confirm-actions">
                  <button type="button" className="outline-button" onClick={() => setConfirming(false)} disabled={busy}>Keep my pass</button>
                  <button type="button" className="primary-button" onClick={requestRefund} disabled={busy}>
                    {busy ? <LoaderCircle size={15} className="spin" /> : null} Confirm refund
                  </button>
                </div>
              </div>
            ) : booking.canRefund ? (
              <button type="button" className="outline-button refund-request" onClick={() => setConfirming(true)}>Request refund</button>
            ) : (
              <p className="refund-muted">Refund not available for this booking. Contact the organizer if you need help.</p>
            )}
            {error && <p className="ticket-error" role="alert">{error}</p>}
          </section>
        )}

        <a className="landing-back fx-reveal" href="/tickets"><ArrowLeft size={14} /> Book another pass</a>
      </article>
    </main>
  )
}
