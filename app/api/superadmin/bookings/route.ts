import type { RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit'
import { getAdminSession, hasAdminPermission, requestIsSameOrigin } from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'
import { isRazorpayEnabled } from '@/lib/razorpay'
import { refundBooking } from '@/lib/booking-refund'

export const runtime = 'nodejs'

export type BookingRow = RowDataPacket & {
  id: number
  ticket_ref: string | null
  state: string
  city: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  tier_id: string
  tier_name: string
  quantity: number
  amount_paise: number
  currency: string
  status: 'created' | 'paid' | 'failed'
  refund_status: 'none' | 'refunded'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_refund_id: string | null
  created_at: Date
  refunded_at: Date | null
}

export type BookingSummary = {
  rows: number
  ticketsSold: number
  grossPaise: number
  refundedPaise: number
  netCollectedPaise: number
  byLocation: Array<{ state: string; city: string; ticketsSold: number; netCollectedPaise: number }>
}

const COLUMNS = 'id, ticket_ref, state, city, buyer_name, buyer_email, buyer_phone, tier_id, tier_name, quantity, amount_paise, currency, status, refund_status, razorpay_order_id, razorpay_payment_id, razorpay_refund_id, created_at, refunded_at'

function csvCell(value: string | number | Date | null) {
  const text = value instanceof Date ? value.toISOString() : value === null ? '' : String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function buildFilter(params: URLSearchParams) {
  const state = params.get('state')?.trim() || ''
  const city = params.get('city')?.trim() || ''
  const clauses: string[] = []
  const values: string[] = []
  if (state) { clauses.push('state = ?'); values.push(state) }
  if (city) { clauses.push('city = ?'); values.push(city) }
  return { state, city, where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values }
}

function summarise(rows: BookingRow[]): BookingSummary {
  let ticketsSold = 0, gross = 0, refunded = 0
  const locMap = new Map<string, { state: string; city: string; ticketsSold: number; netCollectedPaise: number }>()
  for (const row of rows) {
    if (row.status === 'paid') {
      ticketsSold += row.quantity
      gross += row.amount_paise
      const net = row.refund_status === 'refunded' ? 0 : row.amount_paise
      if (row.refund_status === 'refunded') refunded += row.amount_paise
      const key = `${row.state}||${row.city}`
      const entry = locMap.get(key) || { state: row.state, city: row.city, ticketsSold: 0, netCollectedPaise: 0 }
      entry.ticketsSold += row.quantity
      entry.netCollectedPaise += net
      locMap.set(key, entry)
    }
  }
  return {
    rows: rows.length,
    ticketsSold,
    grossPaise: gross,
    refundedPaise: refunded,
    netCollectedPaise: gross - refunded,
    byLocation: [...locMap.values()].sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city)),
  }
}

function asRecord(row: BookingRow) {
  return {
    ticket_ref: row.ticket_ref || '',
    state: row.state,
    city: row.city,
    status: row.status,
    refund_status: row.refund_status,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    buyer_phone: row.buyer_phone,
    tier_name: row.tier_name,
    quantity: row.quantity,
    amount_rupees: (row.amount_paise / 100).toFixed(2),
    currency: row.currency,
    razorpay_order_id: row.razorpay_order_id || '',
    razorpay_payment_id: row.razorpay_payment_id || '',
    razorpay_refund_id: row.razorpay_refund_id || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    refunded_at: row.refunded_at instanceof Date ? row.refunded_at.toISOString() : (row.refunded_at || ''),
  }
}

function buildXlsx(rows: BookingRow[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows.map(asRecord))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Bookings')
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function rupees(paise: number) { return `Rs. ${(paise / 100).toLocaleString('en-IN')}` }

function buildPdf(rows: BookingRow[], summary: BookingSummary, scope: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    doc.fontSize(18).text('Film Expo India - Pass Bookings Report')
    doc.fontSize(10).fillColor('#555').text(`Generated ${new Date().toLocaleString('en-IN')}`)
    doc.text(`Filter: ${scope}`).moveDown(0.6)

    doc.fillColor('#000').fontSize(11)
    doc.text(`Total records: ${summary.rows}`)
    doc.text(`Tickets sold (paid): ${summary.ticketsSold}`)
    doc.text(`Gross collected: ${rupees(summary.grossPaise)}`)
    doc.text(`Refunded: ${rupees(summary.refundedPaise)}`)
    doc.text(`Net collected: ${rupees(summary.netCollectedPaise)}`).moveDown(0.6)

    doc.fontSize(12).text('By location', { underline: true }).moveDown(0.3)
    doc.fontSize(10)
    if (summary.byLocation.length) {
      for (const loc of summary.byLocation) {
        doc.text(`${loc.state} - ${loc.city}: ${loc.ticketsSold} ticket(s), ${rupees(loc.netCollectedPaise)}`)
      }
    } else {
      doc.text('No paid bookings in this selection.')
    }
    doc.moveDown(0.8).fontSize(12).text('Detailed bookings', { underline: true }).moveDown(0.3)

    doc.fontSize(8)
    const header = ['Ticket', 'State', 'City', 'Status', 'Buyer', 'Pass', 'Qty', 'Amount'].map((h) => ({ h, w: [78, 66, 58, 44, 120, 74, 22, 60] }))
    let x = 40
    for (const col of header) { doc.text(col.h, x, doc.y, { width: col.w[0], lineBreak: false }); x += col.w[0] }
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#999').stroke()
    doc.moveDown(0.2)
    for (const row of rows.slice(0, 400)) {
      if (doc.y > 760) doc.addPage()
      const widths = [78, 66, 58, 44, 120, 74, 22, 60]
      const cells = [row.ticket_ref || '', row.state, row.city, row.refund_status === 'refunded' ? 'refunded' : row.status, row.buyer_name, row.tier_name, String(row.quantity), (row.amount_paise / 100).toLocaleString('en-IN')]
      let cx = 40
      cells.forEach((val, i) => { doc.text(String(val).slice(0, 26), cx, doc.y, { width: widths[i], lineBreak: false }); cx += widths[i] })
      doc.moveDown(0.15)
    }
    doc.end()
  })
}

async function loadBookings(params: URLSearchParams) {
  const { where, values } = buildFilter(params)
  const [rows] = await getPool().query<BookingRow[]>(
    `SELECT ${COLUMNS} FROM bookings${where} ORDER BY created_at DESC LIMIT 5000`,
    values,
  )
  return rows
}

export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  if (!hasAdminPermission(session, 'bookings', 'read')) {
    return NextResponse.json({ error: 'This account cannot view bookings.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const { state, city } = buildFilter(url.searchParams)
  const rows = await loadBookings(url.searchParams)
  const summary = summarise(rows)
  const scope = state ? (city ? `${state}, ${city}` : state) : 'All locations'
  const format = url.searchParams.get('format')

  if (format === 'xlsx') {
    const buffer = buildXlsx(rows)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="film-expo-bookings.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  }
  if (format === 'pdf') {
    const buffer = await buildPdf(rows, summary, scope)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="film-expo-bookings-report.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (format === 'csv') {
    const columns = ['ticket_ref', 'state', 'city', 'status', 'refund_status', 'buyer_name', 'buyer_email', 'buyer_phone', 'tier_name', 'quantity', 'amount_rupees', 'currency', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_refund_id', 'created_at', 'refunded_at']
    const records = rows.map((row) => [
      row.ticket_ref, row.state, row.city, row.status, row.refund_status, row.buyer_name, row.buyer_email, row.buyer_phone,
      row.tier_name, row.quantity, (row.amount_paise / 100).toFixed(2), row.currency,
      row.razorpay_order_id, row.razorpay_payment_id, row.razorpay_refund_id, row.created_at, row.refunded_at,
    ].map(csvCell).join(','))
    return new Response([columns.map(csvCell).join(','), ...records].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="film-expo-bookings.csv"',
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({ bookings: rows, summary }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  if (!hasAdminPermission(session, 'bookings', 'edit')) {
    return NextResponse.json({ error: 'This account cannot process refunds.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const id = Number((body as { id?: unknown })?.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'A valid booking id is required.' }, { status: 400 })
  }
  if (!isRazorpayEnabled()) {
    return NextResponse.json({ error: 'Refunds are not available right now.' }, { status: 503 })
  }

  const pool = getPool()
  const [rows] = await pool.query<BookingRow[]>('SELECT * FROM bookings WHERE id = ?', [id])
  const booking = rows[0]
  if (!booking) return NextResponse.json({ error: 'That booking was not found.' }, { status: 404 })

  try {
    const refund = await refundBooking(pool, booking)
    return NextResponse.json({ success: true, refundId: refund.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refund failed.'
    const status = message.includes('already been refunded') ? 409 : message.includes('Only completed') ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
