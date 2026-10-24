import { NextResponse } from 'next/server'
import { createOtpChallenge, EMAIL_OTP_CHALLENGE_COOKIE, EMAIL_OTP_TTL_SECONDS, EMAIL_VERIFIED_COOKIE, getOtpCookieOptions, normalizeEmail } from '@/lib/email-otp'
import { incrementEmailOtpRateLimits } from '@/lib/email-otp-rate-limit'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { getMailer } from '@/lib/mailer'

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
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const fields = body as Record<string, unknown>
  if (typeof fields.email !== 'string') {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const email = normalizeEmail(fields.email)
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const [emailCount, ipCount] = await incrementEmailOtpRateLimits([`email:${email}`, `ip:${ip}`])
  if (emailCount > 3 || ipCount > 10) {
    return NextResponse.json({ error: 'Too many code requests. Please try again in 15 minutes.' }, { status: 429 })
  }

  const challenge = createOtpChallenge(email)
  const response = NextResponse.json({ success: true, message: 'A verification code has been sent.' })
  response.cookies.set(EMAIL_OTP_CHALLENGE_COOKIE, challenge.token, getOtpCookieOptions(EMAIL_OTP_TTL_SECONDS))
  response.cookies.set(EMAIL_VERIFIED_COOKIE, '', { ...getOtpCookieOptions(0), maxAge: 0 })

  try {
    const { transport, from } = getMailer()
    await transport.sendMail({
      from,
      to: email,
      subject: 'Your Film Expo India verification code',
      text: `Your Film Expo India verification code is ${challenge.otp}. It expires in 10 minutes.`,
      html: `<p>Your Film Expo India verification code is <strong>${challenge.otp}</strong>.</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
    })
  } catch (error) {
    console.error('Unable to send email verification code.', error instanceof Error ? error.message : 'Unknown SMTP error.')
    const failure = NextResponse.json({ error: 'Could not send the verification email. Please try again later.' }, { status: 503 })
    failure.cookies.set(EMAIL_OTP_CHALLENGE_COOKIE, '', { ...getOtpCookieOptions(0), maxAge: 0 })
    failure.cookies.set(EMAIL_VERIFIED_COOKIE, '', { ...getOtpCookieOptions(0), maxAge: 0 })
    return failure
  }

  return response
}
