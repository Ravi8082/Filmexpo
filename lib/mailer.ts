import type { Transporter } from 'nodemailer'
import nodemailer from 'nodemailer'

type Mailer = { transport: Transporter; from: string }
let cached: Mailer | null = null

export function getMailer(): Mailer {
  if (cached) return cached
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM
  const port = Number(process.env.SMTP_PORT || 587)
  if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.')
  }
  cached = {
    transport: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass: password },
    }),
    from,
  }
  return cached
}

export async function sendMailSafe(options: { to: string; subject: string; text: string; html: string }) {
  try {
    const { transport, from } = getMailer()
    await transport.sendMail({ from, ...options })
    return true
  } catch (error) {
    console.error('Unable to send email.', error instanceof Error ? error.message : 'Unknown SMTP error.')
    return false
  }
}
