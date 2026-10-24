import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { EMAIL_VERIFIED_COOKIE, isEmailTokenValid } from '@/lib/email-otp'
import { incrementEmailOtpRateLimits } from '@/lib/email-otp-rate-limit'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'
import { parseEngagementInput } from '@/lib/engagement-validation.mjs'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  if (Number(request.headers.get('content-length') || 0) > 4_000) {
    return NextResponse.json({ error: 'Submission is too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Please complete the form correctly.' }, { status: 400 })
  }

  const submission = parseEngagementInput(body)
  if (!submission) {
    return NextResponse.json({ error: 'Please enter a valid email and accept the required notices.' }, { status: 400 })
  }

  const verifiedToken = (await cookies()).get(EMAIL_VERIFIED_COOKIE)?.value
  if (!isEmailTokenValid(verifiedToken, submission.email)) {
    return NextResponse.json({ error: 'Verify your email before submitting this form.' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const [ipCount, emailCount] = await incrementEmailOtpRateLimits([
    `engagement-ip:${ip}`,
    `engagement-email:${submission.type}:${submission.email}`,
  ])
  if (ipCount > 20 || emailCount > 5) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
  }

  await getPool().execute(
    `INSERT INTO email_engagements (engagement_type, email, is_active, privacy_accepted_at, marketing_consent_at)
     VALUES (?, ?, TRUE, UTC_TIMESTAMP(), IF(?, UTC_TIMESTAMP(), NULL))
     ON DUPLICATE KEY UPDATE
       is_active = TRUE,
       privacy_accepted_at = UTC_TIMESTAMP(),
       marketing_consent_at = IF(?, UTC_TIMESTAMP(), marketing_consent_at),
       updated_at = CURRENT_TIMESTAMP`,
    [submission.type, submission.email, submission.marketingConsent, submission.marketingConsent],
  )

  return NextResponse.json({
    success: true,
    message: submission.type === 'newsletter'
      ? 'You are subscribed to Film Expo India updates.'
      : 'Your registration request is recorded. Our team will share event details with you.',
  }, { status: 201 })
}
