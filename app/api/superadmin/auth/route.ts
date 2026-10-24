import type { RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSession,
  isValidAdminEmail,
  parseAdminPermissions,
  requestIsSameOrigin,
  verifyAdminPassword,
} from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'

export const runtime = 'nodejs'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function loginAttemptKey(request: Request, email: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return `${ip}|${email}`
}

function loginLockedOut(key: string) {
  const entry = loginAttempts.get(key)
  if (!entry) return false
  if (Date.now() >= entry.resetAt) {
    loginAttempts.delete(key)
    return false
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS
}

function recordFailedLogin(key: string) {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return
  }
  entry.count += 1
}

function clearLoginAttempts(key: string) {
  loginAttempts.delete(key)
}

type LoginRow = RowDataPacket & {
  id: number
  password_hash: string
  is_active: number
  email: string
  role: 'superadmin' | 'subadmin'
  permissions_json: unknown
}

export async function GET() {
  const session = await getAdminSession()
  return NextResponse.json({
    authenticated: Boolean(session),
    account: session ? { email: session.email, role: session.role, permissions: session.permissions } : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body)
    || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  if (!isValidAdminEmail(email) || body.password.length > 200) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  const attemptKey = loginAttemptKey(request, email)
  if (loginLockedOut(attemptKey)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in 15 minutes.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const [rows] = await getPool().execute<LoginRow[]>(
    'SELECT id, email, password_hash, role, permissions_json, is_active FROM admin_users WHERE email = ? LIMIT 1',
    [email],
  )
  const account = rows[0]
  if (!account || !account.is_active || !await verifyAdminPassword(body.password, account.password_hash)) {
    recordFailedLogin(attemptKey)
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  clearLoginAttempts(attemptKey)

  const { token, maxAge } = createAdminSessionToken(account.id)
  const response = NextResponse.json({
    success: true,
    account: { email: account.email, role: account.role, permissions: parseAdminPermissions(account.permissions_json) },
  })
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  })
  return response
}

export async function DELETE(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
