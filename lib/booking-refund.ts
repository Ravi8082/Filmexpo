import type { Pool } from 'mysql2/promise'
import { createRazorpayRefund } from '@/lib/razorpay'
import { sendMailSafe } from '@/lib/mailer'
import { getHomepageContent } from '@/lib/site-content'

export type RefundableBooking = {
  id: number
  buyer_email: string
  buyer_name: string
  tier_name: string
  quantity: number
  amount_paise: number
  razorpay_payment_id: string | null
  refund_status: 'none' | 'refunded'
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

// Issues a full Razorpay refund, records it, and notifies buyer + admin. Throws if the gateway call fails.
export async function refundBooking(pool: Pool, booking: RefundableBooking) {
  if (!booking.razorpay_payment_id || !booking.amount_paise) {
    throw new Error('Only completed payments can be refunded.')
  }
  if (booking.refund_status === 'refunded') {
    throw new Error('This booking has already been refunded.')
  }

  const refund = await createRazorpayRefund(booking.razorpay_payment_id, booking.amount_paise)
  await pool.execute(
    "UPDATE bookings SET refund_status = 'refunded', razorpay_refund_id = ?, refunded_at = CURRENT_TIMESTAMP WHERE id = ?",
    [refund.id, booking.id],
  )

  const adminEmail = await getHomepageContent().then(({ content }) => content.footer.email).catch(() => 'info@filmexpoindia.com')
  const rupees = (booking.amount_paise / 100).toLocaleString('en-IN')
  const safeName = escapeHtml(booking.buyer_name)
  void Promise.all([
    sendMailSafe({
      to: booking.buyer_email,
      subject: 'Your Film Expo India refund is processed',
      text: `Hi ${booking.buyer_name},\n\nYour refund for ${booking.tier_name} x${booking.quantity} (INR ${rupees}) has been processed. It may take 5-7 working days to reach your account.\n\nRefund reference: ${refund.id}`,
      html: `<p>Hi ${safeName},</p><p>Your refund for <strong>${escapeHtml(booking.tier_name)} &times;${booking.quantity}</strong> (INR ${rupees}) has been processed. It typically takes 5-7 working days to reach your account.</p><p>Refund reference: ${refund.id}</p>`,
    }),
    sendMailSafe({
      to: adminEmail,
      subject: `Refund processed: ${booking.tier_name} — ${booking.buyer_name}`,
      text: `${booking.buyer_name} (${booking.buyer_email}) was refunded INR ${rupees} for ${booking.tier_name} x${booking.quantity}. Refund id: ${refund.id}.`,
      html: `<p><strong>INR ${rupees}</strong> refunded to ${safeName} (${escapeHtml(booking.buyer_email)}) for ${booking.quantity} × ${escapeHtml(booking.tier_name)}. Refund reference: ${refund.id}.</p>`,
    }),
  ]).catch((error) => {
    console.error('Refund confirmation email failed.', error instanceof Error ? error.message : 'Unknown error.')
  })

  return refund
}
