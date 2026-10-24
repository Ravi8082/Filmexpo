import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const EMAIL_OTP_CHALLENGE_COOKIE = 'film_expo_email_otp'
export const EMAIL_VERIFIED_COOKIE = 'film_expo_email_verified'
export const EMAIL_OTP_TTL_SECONDS = 10 * 60

type Challenge = {
  emailHash: string
  otpDigest: string
  expiresAt: number
  attempts: number
}

function getSecret() {
  const secret = process.env.EMAIL_OTP_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('EMAIL_OTP_SECRET must contain at least 32 characters.')
  }
  return secret
}

function hmac(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function signPayload(payload: string) {
  return hmac(payload)
}

function readSignedPayload<T>(token: string | undefined): T | null {
  if (!token) return null
  const [payload, signature, ...extra] = token.split('.')
  if (!payload || !signature || extra.length || !safeEqual(signature, signPayload(payload))) return null

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function makeToken(payload: unknown) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signPayload(encoded)}`
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function createOtpRateKey(value: string) {
  return createHash('sha256').update(`${getSecret()}:${value}`).digest('hex')
}

export function createOtpChallenge(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const expiresAt = Math.floor(Date.now() / 1000) + EMAIL_OTP_TTL_SECONDS
  const emailHash = hmac(`email:${normalizedEmail}`)
  const otpDigest = hmac(`otp:${emailHash}:${otp}`)
  const challenge: Challenge = { emailHash, otpDigest, expiresAt, attempts: 0 }

  return {
    otp,
    token: makeToken(challenge),
    expiresAt,
  }
}

export function verifyOtpChallenge(token: string | undefined, email: string, otp: string) {
  const challenge = readSignedPayload<Challenge>(token)
  if (!challenge
    || challenge.expiresAt <= Math.floor(Date.now() / 1000)
    || challenge.attempts >= 5
    || !/^\d{6}$/.test(otp)
    || !safeEqual(challenge.emailHash, hmac(`email:${normalizeEmail(email)}`))) {
    return { valid: false as const, attempts: challenge?.attempts ?? 0 }
  }

  const digest = hmac(`otp:${challenge.emailHash}:${otp}`)
  return {
    valid: safeEqual(challenge.otpDigest, digest),
    attempts: challenge.attempts,
    emailHash: challenge.emailHash,
  }
}

export function incrementChallengeAttempts(token: string | undefined) {
  const challenge = readSignedPayload<Challenge>(token)
  if (!challenge || challenge.expiresAt <= Math.floor(Date.now() / 1000)) return null
  challenge.attempts += 1
  return makeToken(challenge)
}

export function createVerifiedEmailToken(email: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60
  return makeToken({
    emailHash: hmac(`email:${normalizeEmail(email)}`),
    expiresAt,
  })
}

export function isEmailTokenValid(token: string | undefined, email: string) {
  const verified = readSignedPayload<{ emailHash: string; expiresAt: number }>(token)
  return Boolean(
    verified
      && verified.expiresAt > Math.floor(Date.now() / 1000)
      && safeEqual(verified.emailHash, hmac(`email:${normalizeEmail(email)}`)),
  )
}

export function getOtpCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}
