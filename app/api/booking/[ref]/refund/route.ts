import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { incrementEmailOtpRateLimit } from '@/lib/email-otp-rate-limit'
import { getPool } from '@/lib/mysql'
import { isRazorpayEnabled } from '@/lib/razorpay'
import { refundBooking, type RefundableBooking } from '@/lib/booking-refund'

export const runtime = 'nodejs'

type BookingRow = RowDataPacket & RefundableBooking

function cleanRef(value: string) {
  return /^[A-Za-z0-9-]{6,40}$/.test(value) ? value.toUpperCase() : ''
}

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }
  if (!isRazorpayEnabled()) {
    return NextResponse.json({ error: 'Refunds are not available right now. Please contact the organizer.' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const ipCount = await incrementEmailOtpRateLimit(`refund-ip:${ip}`)
  if (ipCount > 5) {
    return NextResponse.json({ error: 'Too many refund requests. Please try again later or contact us.' }, { status: 429 })
  }

  const { ref } = await params
  const ticketRef = cleanRef(ref)
  if (!ticketRef) {
    return NextResponse.json({ error: 'Invalid ticket reference.' }, { status: 400 })
  }

  const pool = getPool()
  const [rows] = await pool.query<BookingRow[]>(
    `SELECT id, buyer_email, buyer_name, tier_name, quantity, amount_paise, razorpay_payment_id, refund_status
     FROM bookings WHERE ticket_ref = ?`,
    [ticketRef],
  )
  const booking = rows[0]
  if (!booking) {
    return NextResponse.json({ error: 'That booking was not found.' }, { status: 404 })
  }

  try {
    const refund = await refundBooking(pool, booking)
    return NextResponse.json({ success: true, refundId: refund.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'We could not process your refund.'
    const alreadyDone = message.includes('already been refunded')
    const notPaid = message.includes('Only completed payments')
    return NextResponse.json(
      { error: alreadyDone ? 'This booking has already been refunded.'
        : notPaid ? 'Only completed payments can be refunded. If your pass is pending, contact us.'
        : message },
      { status: alreadyDone ? 409 : notPaid ? 400 : 502 },
    )
  }
}
