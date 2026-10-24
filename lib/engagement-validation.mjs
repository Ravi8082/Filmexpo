const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseEngagementInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const type = value.type
  if (type !== 'registration' && type !== 'newsletter') return null
  if (typeof value.email !== 'string') return null

  const email = value.email.trim().toLowerCase()
  if (email.length > 254 || !emailPattern.test(email)) return null
  if (value.privacyAccepted !== true) return null
  if (type === 'newsletter' && value.marketingConsent !== true) return null

  return {
    type,
    email,
    marketingConsent: type === 'newsletter',
  }
}
