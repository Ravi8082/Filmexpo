import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import type { RowDataPacket } from 'mysql2'
import { getPool } from '@/lib/mysql'
import { TicketLanding } from '@/components/ticket-landing'

export const dynamic = 'force-dynamic'

type Booking = RowDataPacket & {
  id: number
  tier_id: string
  tier_name: string
  quantity: number
  amount_paise: number
  currency: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  ticket_ref: string
  status: 'created' | 'paid' | 'failed'
  refund_status: 'none' | 'refunded'
  razorpay_payment_id: string | null
  created_at: string
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://filmexpoindia.com').replace(/\/+$/, '')

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params
  return { title: `Ticket ${ref.toUpperCase()} | Film Expo India`, robots: { index: false, follow: false } }
}

export default async function BookingLandingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: rawRef } = await params
  const ticketRef = (/^[A-Za-z0-9-]{6,40}$/.test(rawRef) ? rawRef.toUpperCase() : '')
  if (!ticketRef) notFound()

  const [rows] = await getPool().query<Booking[]>(
    `SELECT id, tier_id, tier_name, quantity, amount_paise, currency, buyer_name, buyer_email, buyer_phone,
            ticket_ref, status, refund_status, razorpay_payment_id, created_at
     FROM bookings WHERE ticket_ref = ?`,
    [ticketRef],
  )
  const booking = rows[0]
  if (!booking) notFound()

  const qrDataUrl = booking.status === 'paid' && booking.refund_status === 'none'
    ? await QRCode.toDataURL(`${siteUrl}/booking/${booking.ticket_ref}`, { margin: 1, width: 512, errorCorrectionLevel: 'M' })
    : ''

  return (
    <TicketLanding
      booking={{
        ticketRef: booking.ticket_ref,
        tierName: booking.tier_name,
        quantity: booking.quantity,
        amountRupees: booking.amount_paise / 100,
        currency: booking.currency,
        buyerName: booking.buyer_name,
        buyerEmail: booking.buyer_email,
        status: booking.status,
        refundStatus: booking.refund_status,
        canRefund: booking.status === 'paid' && Boolean(booking.razorpay_payment_id) && booking.refund_status === 'none',
        createdAt: booking.created_at,
      }}
      qrDataUrl={qrDataUrl}
      verifyUrl={`${siteUrl}/booking/${booking.ticket_ref}`}
    />
  )
}
