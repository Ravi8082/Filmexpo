import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { requestIsSameOrigin } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'
import { isRazorpayEnabled, verifyPaymentSignature } from '@/lib/razorpay'
import { sendMailSafe } from '@/lib/mailer'
import { getHomepageContent } from '@/lib/site-content'

export const runtime = 'nodejs'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length <= maxLength ? value.trim() : ''
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }
  if (!isRazorpayEnabled()) {
    return NextResponse.json({ error: 'Payment verification is not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payment payload.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payment payload.' }, { status: 400 })
  }

  const fields = body as Record<string, unknown>
  const orderId = clean(fields.razorpay_order_id, 80)
  const paymentId = clean(fields.razorpay_payment_id, 80)
  const signature = clean(fields.razorpay_signature, 128)
  if (!orderId || !paymentId || !/^[0-9a-f]{64}$/.test(signature)) {
    return NextResponse.json({ error: 'Invalid payment details.' }, { status: 400 })
  }

  const valid = verifyPaymentSignature({
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    orderId,
    paymentId,
    signature,
  })

  const pool = getPool()
  if (!valid) {
    await pool.execute("UPDATE bookings SET status = 'failed' WHERE razorpay_order_id = ? AND status = 'created'", [orderId])
    return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 })
  }

  const [result] = await pool.execute(
    "UPDATE bookings SET status = 'paid', razorpay_payment_id = ? WHERE razorpay_order_id = ? AND status = 'created'",
    [paymentId, orderId],
  )
  if ((result as { affectedRows: number }).affectedRows === 0) {
    return NextResponse.json({ error: 'Booking not found or already processed.' }, { status: 404 })
  }

  const [rows] = await pool.query<Array<RowDataPacket & { buyer_email: string; buyer_name: string; tier_name: string; quantity: number; amount_paise: number; ticket_ref: string | null }>>(
    'SELECT buyer_email, buyer_name, tier_name, quantity, amount_paise, ticket_ref FROM bookings WHERE razorpay_order_id = ?',
    [orderId],
  )
  const booking = rows[0]
  if (booking) {
    void notifyBooking(booking).catch((error) => {
      console.error('Booking confirmation email failed.', error instanceof Error ? error.message : 'Unknown error.')
    })
  }

  return NextResponse.json({ success: true, ticketRef: booking?.ticket_ref ?? '' })
}

async function notifyBooking(booking: { buyer_email: string; buyer_name: string; tier_name: string; quantity: number; amount_paise: number }) {
  const adminEmail = await getHomepageContent().then(({ content }) => content.footer.email).catch(() => 'info@filmexpoindia.com')
  const rupees = (booking.amount_paise / 100).toLocaleString('en-IN')
  const safeName = booking.buyer_name.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
  await Promise.all([
    sendMailSafe({
      to: booking.buyer_email,
      subject: 'Your Film Expo India pass is booked',
      text: `Hi ${booking.buyer_name},\n\nYour ${booking.tier_name} x${booking.quantity} booking is confirmed. Amount paid: INR ${rupees}.\n\nSee you at Film Expo India!`,
      html: `<p>Hi ${safeName},</p><p>Your <strong>${booking.tier_name} &times;${booking.quantity}</strong> booking is confirmed. Amount paid: <strong>INR ${rupees}</strong>.</p><p>See you at Film Expo India!</p>`,
    }),
    sendMailSafe({
      to: adminEmail,
      subject: `New pass booking: ${booking.tier_name} — ${booking.buyer_name}`,
      text: `${booking.buyer_name} (${booking.buyer_email}, ${booking.quantity} x ${booking.tier_name}, INR ${rupees}) paid for a pass.`,
      html: `<p><strong>${booking.quantity} × ${booking.tier_name}</strong> booked by ${safeName} (${booking.buyer_email}). Amount paid: INR ${rupees}.</p>`,
    }),
  ])
}
