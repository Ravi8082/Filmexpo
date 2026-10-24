'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Check, Mail } from 'lucide-react'

export type EmailOtpControlHandle = {
  isSent: () => boolean
  isVerified: () => boolean
  sendCode: () => Promise<boolean>
}

export type EmailOtpState = { email: string; sent: boolean; verified: boolean }

type EmailOtpControlProps = {
  label?: string
  placeholder?: string
  ariaLabel?: string
  sendOnSubmit?: boolean
  onStateChange?: (state: EmailOtpState) => void
}

type ApiResponse = { error?: string; message?: string }

async function requestJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result: ApiResponse = await response.json()
  if (!response.ok) throw new Error(result.error || 'Email verification could not be completed.')
  return result
}

export const EmailOtpControl = forwardRef<EmailOtpControlHandle, EmailOtpControlProps>(function EmailOtpControl({
  label = 'Email',
  placeholder,
  ariaLabel,
  sendOnSubmit = false,
  onStateChange,
}, ref) {
  const emailInput = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useImperativeHandle(ref, () => ({
    isSent: () => sent,
    isVerified: () => verified,
    sendCode,
  }), [email, sendCode, sent, sendOnSubmit, verified])

  useEffect(() => {
    const form = emailInput.current?.form
    if (!form) return

    function reset() {
      setEmail('')
      setOtp('')
      setSent(false)
      setVerified(false)
      setStatus('')
      setError('')
      emailInput.current?.setCustomValidity('')
      onStateChange?.({ email: '', sent: false, verified: false })
    }

    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  }, [onStateChange])

  function updateEmail(value: string) {
    setEmail(value)
    setOtp('')
    setSent(false)
    setVerified(false)
    setStatus('')
    setError('')
    emailInput.current?.setCustomValidity(!sendOnSubmit && value ? 'Verify this email address before submitting.' : '')
    onStateChange?.({ email: value, sent: false, verified: false })
  }

  async function sendCode(): Promise<boolean> {
    const input = emailInput.current
    if (!input) return false
    input.setCustomValidity('')
    if (!input.reportValidity()) return false
    if (!sendOnSubmit) input.setCustomValidity('Verify this email address before submitting.')

    setBusy('send')
    setError('')
    setStatus('')
    try {
      const result = await requestJson('/api/email-otp/send', { email })
      setSent(true)
      setVerified(false)
      setStatus(result.message || 'A verification code has been sent.')
      onStateChange?.({ email, sent: true, verified: false })
      return true
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the verification code.')
      return false
    } finally {
      setBusy(null)
    }
  }

  async function verifyCode() {
    setBusy('verify')
    setError('')
    setStatus('')
    try {
      const result = await requestJson('/api/email-otp/verify', { email, otp })
      setVerified(true)
      emailInput.current?.setCustomValidity('')
      setStatus(result.message || 'Email verified.')
      onStateChange?.({ email, sent: true, verified: true })
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify this code.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`email-otp-control${sent ? ' is-code-sent' : ''}${verified ? ' is-verified' : ''}`}>
      <label className="email-otp-address">
        {label && <span>{label}</span>}
        <input
          ref={emailInput}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          placeholder={placeholder}
          aria-label={ariaLabel || label || 'Email'}
          onChange={(event) => updateEmail(event.target.value)}
        />
      </label>
      {busy && (
        <div className={`email-otp-motion email-otp-motion-${busy}`} role="status">
          <span className="email-otp-motion-icon">{busy === 'send' ? <Mail size={17} /> : <Check size={17} />}</span>
          <span>{busy === 'send' ? 'Sending your code securely…' : 'Checking your code…'}</span>
        </div>
      )}
      <div className="email-otp-actions">
        {sent && !verified && (
          <>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              aria-label="Six-digit email verification code"
              placeholder="6-digit code"
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" className="email-otp-button" disabled={busy !== null || otp.length !== 6} onClick={verifyCode}>
              {busy === 'verify' ? 'Checking…' : 'Verify code'}
            </button>
          </>
        )}
        {!verified && (!sendOnSubmit || sent) && (
          <button type="button" className="email-otp-button" disabled={busy !== null} onClick={sendCode}>
            {busy === 'send' ? 'Sending…' : sent ? 'Send a new code' : 'Send verification code'}
          </button>
        )}
        {verified && <span className="email-otp-verified" role="status"><Check size={15} /> Email verified</span>}
      </div>
      {status && <p className="email-otp-status" role="status">{status}</p>}
      {error && <p className="email-otp-error" role="alert">{error}</p>}
    </div>
  )
})
