'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const CONSENT_KEY = 'fei_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(CONSENT_KEY)
    } catch {
      stored = null
    }
    if (!stored) setVisible(true)
  }, [])

  if (!visible || pathname.startsWith('/superadmin')) return null

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted')
    } catch {
      // storage unavailable; hide for this visit only
    }
    setVisible(false)
  }

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie notice">
      <p>We use essential cookies to keep this site working, and analytics only after your consent. See our <a href="/privacy">Privacy Policy</a>.</p>
      <button type="button" onClick={accept}>Accept</button>
    </div>
  )
}
