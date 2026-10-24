import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { NextResponse } from 'next/server'
import {
  getAdminSession,
  hashAdminPassword,
  isAdminModule,
  isValidAdminEmail,
  isValidAdminPassword,
  parseAdminPermissions,
  requestIsSameOrigin,
  type AdminPermissions,
} from '@/lib/admin-auth'
import { getPool } from '@/lib/mysql'

export const runtime = 'nodejs'

type UserRow = RowDataPacket & {
  id: number
  email: string
  role: 'superadmin' | 'subadmin'
  permissions_json: unknown
  is_active: number
  created_at: Date
}

function validPermissions(value: unknown): value is AdminPermissions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([module, actions]) => {
    if (!isAdminModule(module) || !actions || typeof actions !== 'object' || Array.isArray(actions)) return false
    const record = actions as Record<string, unknown>
    return Object.keys(record).every((action) => action === 'read' || action === 'edit')
      && Object.values(record).every((enabled) => typeof enabled === 'boolean')
      && !(record.edit === true && record.read !== true)
  })
}

async function requireSuperadmin() {
  const session = await getAdminSession()
  return session?.role === 'superadmin' ? session : null
}

export async function GET() {
  if (!await requireSuperadmin()) {
    return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 })
  }
  const [rows] = await getPool().query<UserRow[]>(
    'SELECT id, email, role, permissions_json, is_active, created_at FROM admin_users ORDER BY role, email',
  )
  return NextResponse.json({
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      permissions: parseAdminPermissions(row.permissions_json),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }
  if (!await requireSuperadmin()) {
    return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body)
    || !('permissions' in body) || typeof body.email !== 'string' || typeof body.password !== 'string'
    || !validPermissions(body.permissions)) {
    return NextResponse.json({ error: 'Provide a valid email, password, and module permissions.' }, { status: 400 })
  }
  const email = body.email.trim().toLowerCase()
  if (!isValidAdminEmail(email) || !isValidAdminPassword(body.password)) {
    return NextResponse.json({ error: 'Use a valid email and a password between 12 and 200 characters.' }, { status: 400 })
  }

  const passwordHash = await hashAdminPassword(body.password)
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO admin_users (email, password_hash, role, permissions_json)
       VALUES (?, ?, 'subadmin', CAST(? AS JSON))`,
      [email, passwordHash, JSON.stringify(body.permissions)],
    )
    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'An admin account already uses this email.' }, { status: 409 })
    }
    throw error
  }
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }
  if (!await requireSuperadmin()) {
    return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || !('id' in body) || !('isActive' in body)
    || !('permissions' in body) || typeof body.id !== 'number' || !Number.isSafeInteger(body.id)
    || typeof body.isActive !== 'boolean' || !validPermissions(body.permissions)) {
    return NextResponse.json({ error: 'Provide a valid sub-admin id, status, and module permissions.' }, { status: 400 })
  }
  const [result] = await getPool().execute<ResultSetHeader>(
    `UPDATE admin_users SET permissions_json = CAST(? AS JSON), is_active = ?
     WHERE id = ? AND role = 'subadmin'`,
    [JSON.stringify(body.permissions), body.isActive, body.id],
  )
  if (!result.affectedRows) return NextResponse.json({ error: 'Sub-admin account not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}
