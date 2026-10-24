import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { getPool } from '@/lib/mysql'
import { verifyWebhookSignature } from '@/lib/razorpay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BookingRow = RowDataPacket & { id: number; status: string; razorpay_payment_id: string | null; ticket_ref: string | null }

function newTicketRef() {
  return `FEIT-${Date.now().toString(36).toUpperCase().slice(-4)}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function entityOf(payload: Record<string, unknown>, key: string) {
  const wrap = payload?.[key]
  if (wrap && typeof wrap === 'object' && 'entity' in (wrap as object)) {
    const entity = (wrap as { entity: unknown }).entity
    if (entity && typeof entity === 'object') return entity as Record<string, unknown>
  }
  return null
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') || ''
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ received: true })
  }

  const eventName = typeof event.event === 'string' ? event.event : ''
  const payload = (event.payload || {}) as Record<string, unknown>
  const paymentEntity = entityOf(payload, 'payment')
  const orderEntity = entityOf(payload, 'order')
  const orderId = (paymentEntity?.order_id as string) || (orderEntity?.id as string) || ''

  if (!orderId) {
    return NextResponse.json({ received: true, ignored: eventName })
  }

  const pool = getPool()
  const [rows] = await pool.query<BookingRow[]>('SELECT id, status, razorpay_payment_id, ticket_ref FROM bookings WHERE razorpay_order_id = ?', [orderId])
  const booking = rows[0]

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    if (!booking) {
      return NextResponse.json({ received: true, unknown_order: true })
    }
    if (booking.status !== 'paid') {
      const ticketRef = booking.ticket_ref || newTicketRef()
      const paymentId = (paymentEntity?.id as string) || null
      await pool.execute(
        "UPDATE bookings SET status = 'paid', razorpay_payment_id = COALESCE(?, razorpay_payment_id), ticket_ref = ? WHERE id = ? AND status <> 'paid'",
        [paymentId, ticketRef, booking.id],
      )
    }
  } else if (eventName === 'payment.failed' || eventName === 'order_cancelled' || eventName === 'payment.dispute.created') {
    if (booking && booking.status === 'created') {
      await pool.execute("UPDATE bookings SET status = 'failed' WHERE id = ? AND status = 'created'", [booking.id])
    }
  }

  return NextResponse.json({ received: true })
}
