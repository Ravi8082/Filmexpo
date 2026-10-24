import { createHmac, timingSafeEqual } from 'node:crypto'

const RAZORPAY_API = 'https://api.razorpay.com/v1'

export function isRazorpayEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

// Razorpay signs each webhook delivery with HMAC-SHA256 of the raw request body using the webhook secret.
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const provided = Buffer.from(signature, 'hex')
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

// Pure HMAC check that mirrors Razorpay's server-side signature verification.
export function verifyPaymentSignature(input: {
  keySecret: string
  orderId: string
  paymentId: string
  signature: string
}) {
  const expected = createHmac('sha256', input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest()
  const provided = Buffer.from(input.signature || '', 'hex')
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured.')

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Razorpay order failed (${response.status}). ${detail.slice(0, 200)}`)
  }
  return response.json() as Promise<{ id: string; amount: number; currency: string; key_id: string }>
}

export function getPublicKeyId() {
  return process.env.RAZORPAY_KEY_ID || ''
}

export async function createRazorpayRefund(paymentId: string, amountPaise: number) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured.')

  const response = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountPaise }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Razorpay refund failed (${response.status}). ${detail.slice(0, 200)}`)
  }
  return response.json() as Promise<{ id: string; amount: number; status: string }>
}
