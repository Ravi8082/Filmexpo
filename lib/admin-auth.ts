import { createHmac, timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { cookies } from 'next/headers'
import { getPool } from '@/lib/mysql'

export { hashAdminPassword, verifyAdminPassword } from '@/lib/admin-password.mjs'
export { isValidAdminEmail, isValidAdminPassword } from '@/lib/admin-password.mjs'
export const ADMIN_COOKIE_NAME = 'film_expo_superadmin'
const SESSION_DURATION_SECONDS = 60 * 60 * 8
const ADMIN_MODULES = ['content', 'media', 'gallery', 'blog', 'enquiries', 'engagements', 'bookings'] as const

export type AdminModule = typeof ADMIN_MODULES[number]
export type AdminAction = 'read' | 'edit'
export type AdminPermissions = Partial<Record<AdminModule, Partial<Record<AdminAction, boolean>>>>
export type AdminSession = {
  id: number
  email: string
  role: 'superadmin' | 'subadmin'
  permissions: AdminPermissions
}

type AdminRow = RowDataPacket & {
  id: number
  email: string
  role: 'superadmin' | 'subadmin'
  permissions_json: unknown
  is_active: number
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.')
  }
  return secret
}

function safeEqual(left: string, right: string) {
  const leftHash = createHmac('sha256', 'admin-credential-comparison').update(left).digest()
  const rightHash = createHmac('sha256', 'admin-credential-comparison').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

export function isAdminModule(value: string): value is AdminModule {
  return ADMIN_MODULES.includes(value as AdminModule)
}

export function parseAdminPermissions(value: unknown): AdminPermissions {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const result: AdminPermissions = {}
  for (const module of ADMIN_MODULES) {
    const entry = (parsed as Record<string, unknown>)[module]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const grant = entry as Record<string, unknown>
    result[module] = { read: grant.read === true, edit: grant.edit === true }
  }
  return result
}

export function hasAdminPermission(session: AdminSession | null, module: AdminModule, action: AdminAction) {
  if (!session) return false
  if (session.role === 'superadmin') return true
  const grant = session.permissions[module]
  return grant?.[action] === true || (action === 'read' && grant?.edit === true)
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null

  const [userId, expiresAt, signature, ...extra] = token.split('.')
  if (!userId || !expiresAt || !signature || extra.length || !/^\d+$/.test(userId) || !/^\d+$/.test(expiresAt)) return null
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null

  const expectedSignature = createHmac('sha256', getSessionSecret()).update(`${userId}.${expiresAt}`).digest('base64url')
  if (!safeEqual(signature, expectedSignature)) return null

  const [rows] = await getPool().execute<AdminRow[]>(
    'SELECT id, email, role, permissions_json, is_active FROM admin_users WHERE id = ? LIMIT 1',
    [Number(userId)],
  )
  const row = rows[0]
  if (!row || !row.is_active) return null
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    permissions: parseAdminPermissions(row.permissions_json),
  }
}

export async function isSuperadminAuthenticated() {
  return (await getAdminSession()) !== null
}

export async function isAdminSetupRequired() {
  const [rows] = await getPool().query<Array<RowDataPacket & { account_count: number }>>(
    'SELECT COUNT(*) AS account_count FROM admin_users',
  )
  return rows[0].account_count === 0
}

export function createAdminSessionToken(userId: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  const payload = `${userId}.${expiresAt}`
  const signature = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
  return { token: `${payload}.${signature}`, maxAge: SESSION_DURATION_SECONDS }
}

export function requestIsSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
