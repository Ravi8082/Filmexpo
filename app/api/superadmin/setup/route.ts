import type { RowDataPacket } from 'mysql2'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  hashAdminPassword,
  isValidAdminEmail,
  isValidAdminPassword,
  requestIsSameOrigin,
} from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'

export const runtime = 'nodejs'

type CountRow = RowDataPacket & { account_count: number }

async function hasAdminAccounts() {
  const [rows] = await getPool().query<CountRow[]>('SELECT COUNT(*) AS account_count FROM admin_users')
  return rows[0].account_count > 0
}

export async function GET() {
  return NextResponse.json({
    setupRequired: !(await hasAdminAccounts()),
    setupTokenRequired: process.env.NODE_ENV === 'production',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 2_000) {
    return NextResponse.json({ error: 'Setup request is too large.' }, { status: 413 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body)
    || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Enter an email and a password of at least 12 characters.' }, { status: 400 })
  }

  const hostname = new URL(request.url).hostname
  const isLocalDevelopment = process.env.NODE_ENV === 'development'
    && ['localhost', '127.0.0.1', '::1'].includes(hostname)
  if (!isLocalDevelopment) {
    const expectedToken = process.env.SUPERADMIN_SETUP_TOKEN
    const submittedToken = 'setupToken' in body && typeof body.setupToken === 'string' ? body.setupToken : ''
    if (!expectedToken || expectedToken.length < 32) {
      return NextResponse.json({ error: 'Set a 32-character SUPERADMIN_SETUP_TOKEN to run initial production setup.' }, { status: 503 })
    }
    const expectedHash = createHash('sha256').update(expectedToken).digest()
    const submittedHash = createHash('sha256').update(submittedToken).digest()
    if (!timingSafeEqual(expectedHash, submittedHash)) {
      return NextResponse.json({ error: 'Invalid one-time setup token.' }, { status: 403 })
    }
  }

  const email = body.email.trim().toLowerCase()
  if (!isValidAdminEmail(email) || !isValidAdminPassword(body.password)) {
    return NextResponse.json({ error: 'Use a valid email and a password between 12 and 200 characters.' }, { status: 400 })
  }

  const connection = await getPool().getConnection()
  let lockAcquired = false
  try {
    const [lockRows] = await connection.query<Array<RowDataPacket & { acquired: number | null }>>(
      "SELECT GET_LOCK('film_expo_superadmin_setup', 5) AS acquired",
    )
    lockAcquired = lockRows[0]?.acquired === 1
    if (!lockAcquired) {
      return NextResponse.json({ error: 'Admin setup is busy. Please try again.' }, { status: 503 })
    }

    const [rows] = await connection.query<CountRow[]>('SELECT COUNT(*) AS account_count FROM admin_users')
    if (rows[0].account_count > 0) {
      return NextResponse.json({ error: 'Initial setup is already complete. Sign in instead.' }, { status: 409 })
    }

    const passwordHash = await hashAdminPassword(body.password)
    const [result] = await connection.execute<import('mysql2').ResultSetHeader>(
      `INSERT INTO admin_users (email, password_hash, role, permissions_json)
       VALUES (?, ?, 'superadmin', JSON_OBJECT())`,
      [email, passwordHash],
    )
    const { token, maxAge } = createAdminSessionToken(result.insertId)
    const response = NextResponse.json({ success: true, account: { email, role: 'superadmin', permissions: {} } })
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge,
    })
    return response
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('film_expo_superadmin_setup')")
    connection.release()
  }
}
