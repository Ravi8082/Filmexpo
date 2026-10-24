'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Check, Mail, MoveRight } from 'lucide-react'
import { EmailOtpControl, type EmailOtpControlHandle, type EmailOtpState } from '@/components/email-otp-control'

type EmailEngagementFormProps = {
  type: 'registration' | 'newsletter'
  placeholder: string
  emailLabel: string
  buttonLabel: string
  compact?: boolean
}

export function EmailEngagementForm(props: EmailEngagementFormProps) {
  if (props.type === 'registration') return <RegistrationEngagementForm {...props} />
  return <NewsletterEngagementForm {...props} />
}

function NewsletterEngagementForm({
  placeholder,
  emailLabel,
  buttonLabel,
  compact = false,
}: EmailEngagementFormProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/email-engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newsletter',
          email: data.get('email'),
          privacyAccepted: data.get('privacyAccepted') === 'on',
          marketingConsent: data.get('marketingConsent') === 'on',
        }),
      })
      const result: { error?: string; message?: string } = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your submission could not be saved.')
      setMessage(result.message || 'Your submission has been saved.')
      form.reset()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your submission could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={`email-engagement-form ${compact ? 'is-compact' : ''}`} onSubmit={submit}>
      <label className="email-otp-address">
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          placeholder={placeholder}
          aria-label={emailLabel}
        />
      </label>
      <label className="engagement-consent">
        <input type="checkbox" name="privacyAccepted" required />
        <span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
      </label>
      <label className="engagement-consent">
        <input type="checkbox" name="marketingConsent" required />
        <span>I agree to receive email updates. I can unsubscribe at any time.</span>
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Please wait…' : buttonLabel}
        {compact && <ArrowRight size={17} />}
      </button>
      {message && <p className="engagement-message" role="status">{message}</p>}
      {error && <p className="engagement-error" role="alert">{error}</p>}
    </form>
  )
}

function RegistrationEngagementForm({
  placeholder,
  emailLabel,
  buttonLabel,
}: EmailEngagementFormProps) {
  const otpControl = useRef<EmailOtpControlHandle>(null)
  const [otpState, setOtpState] = useState<EmailOtpState>({ email: '', sent: false, verified: false })
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const otp = otpControl.current
    if (!otp) return

    setError('')
    if (!otp.isVerified()) {
      if (otp.isSent()) return
      await otp.sendCode()
      return
    }

    const data = new FormData(form)
    setBusy(true)
    try {
      const response = await fetch('/api/email-engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'registration',
          email: data.get('email'),
          privacyAccepted: data.get('privacyAccepted') === 'on',
        }),
      })
      const result: { error?: string } = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your registration could not be saved.')
      setComplete(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your registration could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  if (complete) {
    return (
      <div className="registration-success" role="status">
        <div className="registration-success-seal"><Check size={30} strokeWidth={2.5} /></div>
        <span className="registration-success-eyebrow">REGISTRATION RECEIVED</span>
        <h3>Thank you for registering!</h3>
        <p>Our team will contact you soon at <strong>{otpState.email}</strong> with the next steps.</p>
      </div>
    )
  }

  return (
    <form className="email-engagement-form registration-flow" onSubmit={submit}>
      <div className="registration-steps" aria-label="Registration steps">
        <span className="is-current"><i>01</i> Your email</span>
        <MoveRight size={14} aria-hidden="true" />
        <span className={otpState.verified ? 'is-complete' : otpState.sent ? 'is-current' : ''}><i>{otpState.verified ? <Check size={12} /> : '02'}</i> Verify</span>
        <MoveRight size={14} aria-hidden="true" />
        <span className={otpState.verified ? 'is-current' : ''}><i>03</i> Finish</span>
      </div>
      <EmailOtpControl
        ref={otpControl}
        label=""
        placeholder={placeholder}
        ariaLabel={emailLabel}
        sendOnSubmit
        onStateChange={setOtpState}
      />
      <label className="engagement-consent">
        <input type="checkbox" name="privacyAccepted" required />
        <span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
      </label>
      {error && <p className="engagement-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy || (otpState.sent && !otpState.verified)}>
        {busy
          ? 'Completing registration…'
          : otpState.verified
            ? 'Complete registration'
            : otpState.sent
              ? 'Verify the code above to continue'
              : buttonLabel}
        {otpState.verified ? <Check size={17} /> : !otpState.sent && <Mail size={17} />}
      </button>
      {otpState.verified && <p className="registration-next-step">Your email is verified. Complete registration and our team will be in touch.</p>}
    </form>
  )
}
