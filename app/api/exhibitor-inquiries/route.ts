import type { RowDataPacket } from 'mysql2'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAdminSession, hasAdminPermission, requestIsSameOrigin } from '@/lib/admin-auth'
import { EMAIL_VERIFIED_COOKIE, isEmailTokenValid } from '@/lib/email-otp'
import { incrementEmailOtpRateLimits } from '@/lib/email-otp-rate-limit'
import { sendMailSafe } from '@/lib/mailer'
import { getPool } from '@/lib/mysql'
import { getHomepageContent } from '@/lib/site-content'

export const runtime = 'nodejs'

type InquiryInput = {
  name: string
  email: string
  phone: string
  company: string
  interest: string
  message: string
}

function readField(body: Record<string, unknown>, key: keyof InquiryInput, maxLength: number) {
  const value = body[key]
  return typeof value === 'string' && value.trim().length <= maxLength ? value.trim() : null
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '"' ? '&quot;' : '&#39;')
}

async function notifyEnquiry(inquiry: InquiryInput) {
  const adminEmail = await getHomepageContent()
    .then(({ content }) => content.footer.email)
    .catch(() => 'info@filmexpoindia.com')

  const escaped = Object.fromEntries(Object.entries(inquiry).map(([key, value]) => [key, escapeHtml(value)]))
  await Promise.all([
    sendMailSafe({
      to: adminEmail,
      subject: `New enquiry: ${inquiry.interest} — ${inquiry.name}`,
      text: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone}\nCompany: ${inquiry.company}\nInterest: ${inquiry.interest}\n\n${inquiry.message}`,
      html: `<h2>New enquiry</h2><p><strong>Name:</strong> ${escaped.name}</p><p><strong>Email:</strong> ${escaped.email}</p><p><strong>Phone:</strong> ${escaped.phone}</p><p><strong>Company:</strong> ${escaped.company}</p><p><strong>Interest:</strong> ${escaped.interest}</p><p><strong>Message:</strong></p><p>${escaped.message.replace(/\n/g, '<br />')}</p>`,
    }),
    sendMailSafe({
      to: inquiry.email,
      subject: 'We have received your enquiry — Film Expo India',
      text: `Hi ${inquiry.name},\n\nThank you for reaching out to Film Expo India. Our team has received your enquiry about "${inquiry.interest}" and will get back to you shortly.\n\nTeam Film Expo India`,
      html: `<p>Hi ${escaped.name},</p><p>Thank you for reaching out to Film Expo India. Our team has received your enquiry about <strong>${escaped.interest}</strong> and will get back to you shortly.</p><p>Team Film Expo India</p>`,
    }),
  ])
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!hasAdminPermission(session, 'enquiries', 'read')) {
    return NextResponse.json({ error: 'This account cannot view exhibitor enquiries.' }, { status: 403 })
  }

  const [inquiries] = await getPool().query<Array<RowDataPacket & {
    id: number
    name: string
    email: string
    phone: string
    company: string
    interest: string
    message: string
    created_at: Date
  }>>(
    'SELECT id, name, email, phone, company, interest, message, created_at FROM exhibitor_inquiries ORDER BY created_at DESC LIMIT 200',
  )
  return NextResponse.json({ inquiries })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 10_000) {
    return NextResponse.json({ error: 'Enquiry is too large.' }, { status: 413 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Please complete the enquiry form correctly.' }, { status: 400 })
  }

  const fields = body as Record<string, unknown>
  const inquiry: InquiryInput = {
    name: readField(fields, 'name', 120) || '',
    email: readField(fields, 'email', 254) || '',
    phone: readField(fields, 'phone', 40) || '',
    company: readField(fields, 'company', 180) || '',
    interest: readField(fields, 'interest', 80) || '',
    message: readField(fields, 'message', 3000) || '',
  }

  if (!inquiry.name || !inquiry.email || !inquiry.phone || !inquiry.company || !inquiry.interest
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return NextResponse.json({ error: 'Please provide a valid name, email, phone, company and interest.' }, { status: 400 })
  }

  const verifiedToken = (await cookies()).get(EMAIL_VERIFIED_COOKIE)?.value
  if (!isEmailTokenValid(verifiedToken, inquiry.email)) {
    return NextResponse.json({ error: 'Verify your email before sending the enquiry.' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const [ipCount, emailCount] = await incrementEmailOtpRateLimits([
    `inquiry-ip:${ip}`,
    `inquiry-email:${inquiry.email}`,
  ])
  if (ipCount > 10 || emailCount > 5) {
    return NextResponse.json({ error: 'Too many enquiries. Please try again later.' }, { status: 429 })
  }

  await getPool().execute(
    `INSERT INTO exhibitor_inquiries (name, email, phone, company, interest, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [inquiry.name, inquiry.email, inquiry.phone, inquiry.company, inquiry.interest, inquiry.message],
  )

  void notifyEnquiry(inquiry).catch((error) => {
    console.error('Enquiry notification failed.', error instanceof Error ? error.message : 'Unknown error.')
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
