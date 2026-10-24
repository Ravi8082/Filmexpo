import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { incrementEmailOtpRateLimit } from '@/lib/email-otp-rate-limit'
import { getPool } from '@/lib/mysql'
import { createRazorpayOrder, getPublicKeyId, isRazorpayEnabled } from '@/lib/razorpay'
import { getHomepageContent } from '@/lib/site-content'

export const runtime = 'nodejs'

const MAX_QUANTITY = 10

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length <= maxLength ? value.trim() : ''
}

function newTicketRef() {
  return `FEIT-${Date.now().toString(36).toUpperCase().slice(-4)}-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  if (!isRazorpayEnabled()) {
    return NextResponse.json({ error: 'Paid ticket booking is not open yet. Please register your interest instead.' }, { status: 503 })
  }

  if (Number(request.headers.get('content-length') || 0) > 5_000) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const ipCount = await incrementEmailOtpRateLimit(`booking-ip:${ip}`)
  if (ipCount > 15) {
    return NextResponse.json({ error: 'Too many booking attempts. Please try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Please complete the booking form correctly.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Please complete the booking form correctly.' }, { status: 400 })
  }

  const fields = body as Record<string, unknown>
  const tierId = cleanString(fields.tierId, 60)
  const name = cleanString(fields.name, 120)
  const email = cleanString(fields.email, 254)
  const phone = cleanString(fields.phone, 40)
  const state = cleanString(fields.state, 80)
  const city = cleanString(fields.city, 120)
  const quantity = Number(fields.quantity)

  if (!tierId || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone
    || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: 'Please provide valid details and a quantity between 1 and 10.' }, { status: 400 })
  }

  const { content } = await getHomepageContent()
  const tier = content.ticketing.tiers.find((item) => item.id === tierId)
  if (!tier || !Number.isFinite(tier.price) || tier.price <= 0) {
    return NextResponse.json({ error: 'That pass is not available.' }, { status: 400 })
  }

  const locations = content.ticketing.locations || []
  if (locations.length) {
    const match = locations.find((item) => item.state === state)
    if (!match || !match.cities.includes(city)) {
      return NextResponse.json({ error: 'Please choose a valid event state and city.' }, { status: 400 })
    }
  }

  const amountPaise = Math.round(tier.price * 100) * quantity
  const receipt = `FEI-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.slice(0, 40)
  const ticketRef = newTicketRef()

  let order
  try {
    order = await createRazorpayOrder(amountPaise, receipt)
  } catch (error) {
    console.error('Razorpay order creation failed.', error instanceof Error ? error.message : 'Unknown error.')
    return NextResponse.json({ error: 'Payment gateway is unavailable right now. Please try again shortly.' }, { status: 502 })
  }

  await getPool().execute(
    `INSERT INTO bookings (tier_id, tier_name, quantity, amount_paise, currency, buyer_name, buyer_email, buyer_phone, state, city, razorpay_order_id, ticket_ref, status)
     VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, 'created')`,
    [tier.id, tier.name, quantity, amountPaise, name, email, phone, state, city, order.id, ticketRef],
  )

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getPublicKeyId(),
    ticketRef,
    prefill: { name, email, contact: phone },
  })
}
