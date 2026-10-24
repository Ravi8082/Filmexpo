import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  createVerifiedEmailToken,
  EMAIL_OTP_CHALLENGE_COOKIE,
  EMAIL_OTP_TTL_SECONDS,
  EMAIL_VERIFIED_COOKIE,
  getOtpCookieOptions,
  incrementChallengeAttempts,
  normalizeEmail,
  verifyOtpChallenge,
} from '@/lib/email-otp'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { incrementEmailOtpRateLimit } from '@/lib/email-otp-rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 2000) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter your email and six-digit code.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Enter your email and six-digit code.' }, { status: 400 })
  }
  const fields = body as Record<string, unknown>
  if (typeof fields.email !== 'string' || typeof fields.otp !== 'string') {
    return NextResponse.json({ error: 'Enter your email and six-digit code.' }, { status: 400 })
  }

  const email = normalizeEmail(fields.email)
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(fields.otp)) {
    return NextResponse.json({ error: 'Enter a valid email and six-digit code.' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const attempts = await incrementEmailOtpRateLimit(`verify-ip:${ip}`)
  if (attempts > 10) {
    return NextResponse.json({ error: 'Too many verification attempts. Please request a new code later.' }, { status: 429 })
  }

  const cookieStore = await cookies()
  const challengeToken = cookieStore.get(EMAIL_OTP_CHALLENGE_COOKIE)?.value
  const result = verifyOtpChallenge(challengeToken, email, fields.otp)
  if (!result.valid) {
    const response = NextResponse.json({ error: 'That code is incorrect or expired.' }, { status: 400 })
    const updatedToken = incrementChallengeAttempts(challengeToken)
    if (updatedToken) {
      response.cookies.set(EMAIL_OTP_CHALLENGE_COOKIE, updatedToken, getOtpCookieOptions(EMAIL_OTP_TTL_SECONDS))
    } else {
      response.cookies.set(EMAIL_OTP_CHALLENGE_COOKIE, '', { ...getOtpCookieOptions(0), maxAge: 0 })
    }
    return response
  }

  const response = NextResponse.json({ success: true, message: 'Email verified.' })
  response.cookies.set(EMAIL_VERIFIED_COOKIE, createVerifiedEmailToken(email), getOtpCookieOptions(30 * 60))
  response.cookies.set(EMAIL_OTP_CHALLENGE_COOKIE, '', { ...getOtpCookieOptions(0), maxAge: 0 })
  return response
}
